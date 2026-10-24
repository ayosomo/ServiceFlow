import pg from "pg";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { fixtures } from "../packages/fixtures/src.js";
import {
  reconcile,
  requestSchema,
  kpis,
  SNAPSHOT,
} from "../packages/domain/src/index.js";
const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://serviceflow:local-synthetic-only@127.0.0.1:55432/serviceflow",
  connectionTimeoutMillis: 5000,
});
await client.connect();
try {
  const mode = process.argv[2],
    f = fixtures(),
    findings = reconcile(f.crm, f.supplier);
  if (mode === "migrate") {
    await client.query("BEGIN");
    try {
      await client.query(
        await readFile("db/migrations/001-baseline.sql", "utf8"),
      );
      await client.query(
        await readFile("db/migrations/002-request-ids.sql", "utf8"),
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log(
      "Migrations 001/002 applied transactionally (repeatable); legacy IDs retained.",
    );
  } else if (mode === "seed") {
    await client.query("BEGIN");
    // Scoped fixture reset; no schema drop or production connection assumed.
    await client.query(
      "DELETE FROM metric_eligible; DELETE FROM quality_findings; DELETE FROM raw_inputs; DELETE FROM source_updates; DELETE FROM events; DELETE FROM approvals; DELETE FROM requests;",
    );
    for (const r of f.base) {
      await client.query(
        "INSERT INTO requests VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [
          r.requestId,
          r.customerId,
          r.summary,
          r.ownerTeam,
          r.priority,
          r.status,
          r.submittedAt,
          r.targetAt,
          r.actualCompletedAt,
          r.approvalRequired,
          r.approverId,
          r.version,
        ],
      );
      await client.query("INSERT INTO events VALUES($1,$2,$3,$4,$5,$6,$7)", [
        `seed-${r.requestId}`,
        r.requestId,
        "FIXTURE_LOADED",
        "synthetic-loader",
        SNAPSHOT,
        "seed-2301026",
        {},
      ]);
      if (r.approverId)
        await client.query("INSERT INTO approvals VALUES($1,$2,$3,$4,$5,$6)", [
          `approval-${r.requestId}`,
          r.requestId,
          r.approverId,
          r.status === "REJECTED" ? "REJECTED" : "APPROVED",
          "Synthetic approval fixture",
          "2026-10-02T00:00:00.000Z",
        ]);
    }
    for (const [i, s] of f.supplier.entries())
      await client.query("INSERT INTO source_updates VALUES($1,$2,$3,$4,$5)", [
        `update-${i}`,
        s.requestId,
        s.supplierUpdatedAt,
        s.supplierMilestone,
        s.supplierTargetAt,
      ]);
    await client.query("INSERT INTO source_updates VALUES($1,$2,$3,$4,$5)", [
      "older-update-24",
      "REQ-0024",
      "2026-10-20T00:00:00.000Z",
      "OLDER_SYNTHETIC",
      "2026-12-01T00:00:00.000Z",
    ]);
    for (const [source, rows] of [
      ["CRM", f.crm],
      ["SUPPLIER", f.supplier],
    ] as const)
      for (const [i, r] of rows.entries())
        await client.query("INSERT INTO raw_inputs VALUES($1,$2,$3)", [
          source,
          i + 1,
          r,
        ]);
    for (const [i, x] of findings.entries())
      await client.query(
        "INSERT INTO quality_findings VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          i,
          x.requestId,
          x.source,
          x.row,
          x.ruleId,
          x.severity,
          x.owner,
          x.values,
        ],
      );
    for (const r of f.crm)
      if (
        requestSchema.safeParse(r).success &&
        !findings.some(
          (x) => x.severity === "CRITICAL" && x.requestId === r.requestId,
        )
      )
        await client.query("INSERT INTO metric_eligible VALUES($1)", [
          r.requestId,
        ]);
    await client.query("COMMIT");
    console.log(
      "Seeded 48 canonical requests, 96 preserved source rows, findings, approvals and events.",
    );
  } else if (mode === "test") {
    const {
      rows: [sql],
    } = await client.query(await readFile("db/queries/reference.sql", "utf8"), [
      SNAPSHOT,
    ]);
    const actual = kpis(f.crm, findings);
    assert.deepEqual(
      Object.fromEntries(Object.entries(sql).map(([k, v]) => [k, Number(v)])),
      {
        eligible: actual.qualityPassRate.numerator,
        active: actual.readinessRate.denominator,
        ready: actual.readinessRate.numerator,
        overdue: actual.overdue.count,
        done: actual.onTimeCompletion.denominator,
        on_time: actual.onTimeCompletion.numerator,
      },
    );
    assert.equal(
      Number(
        (await client.query("SELECT count(*) FROM requests")).rows[0].count,
      ),
      48,
    );
    assert.equal(
      Number(
        (await client.query("SELECT count(*) FROM raw_inputs")).rows[0].count,
      ),
      96,
    );
    // Real constraint tests in rollback-only savepoints preserve fixture state.
    const latest = await client.query(
      "SELECT supplier_updated_at, supplier_milestone FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY supplier_updated_at DESC, update_id DESC) AS rn FROM source_updates) ranked WHERE request_id=$1 AND rn=1",
      ["REQ-0024"],
    );
    assert.equal(
      latest.rows[0].supplier_updated_at.toISOString(),
      f.supplier[23]!.supplierUpdatedAt,
    );
    assert.equal(
      latest.rows[0].supplier_milestone,
      f.supplier[23]!.supplierMilestone,
    );
    await client.query("BEGIN");
    const uuidId = "REQ-637f6ec2-85b0-42ce-9f30-a295e3be68e1";
    await client.query(
      "INSERT INTO requests SELECT $1,customer_id,summary,owner_team,priority,status,submitted_at,target_at,actual_completed_at,approval_required,approver_id,version FROM requests WHERE request_id=$2",
      [uuidId, "REQ-0001"],
    );
    await client.query(
      "INSERT INTO events VALUES($1,$2,'UUID_TEST','synthetic',now(),'uuid-test','{}')",
      ["uuid-local-event", uuidId],
    );
    assert.equal(
      Number(
        (
          await client.query(
            "SELECT count(*) FROM requests r JOIN events e USING(request_id) WHERE r.request_id=$1",
            [uuidId],
          )
        ).rows[0].count,
      ),
      1,
    );
    await client.query("SAVEPOINT invalid_uuid");
    let invalidUuidRejected = false;
    try {
      await client.query(
        "INSERT INTO requests SELECT $1,customer_id,summary,owner_team,priority,status,submitted_at,target_at,actual_completed_at,approval_required,approver_id,version FROM requests WHERE request_id=$2",
        ["REQ-not-a-uuid", uuidId],
      );
    } catch (error) {
      invalidUuidRejected = (error as { code?: string }).code === "23514";
    }
    await client.query("ROLLBACK TO SAVEPOINT invalid_uuid");
    assert(invalidUuidRejected);
    for (const sql of [
      "INSERT INTO requests SELECT * FROM requests LIMIT 1",
      "INSERT INTO events VALUES('bad','REQ-9999','X','synthetic',now(),'test','{}')",
      "UPDATE requests SET target_at='2020-01-01' WHERE request_id='REQ-0001'",
    ]) {
      await client.query("SAVEPOINT negative");
      let rejected = false;
      try {
        await client.query(sql);
      } catch {
        rejected = true;
      }
      await client.query("ROLLBACK TO SAVEPOINT negative");
      assert.ok(rejected, "Expected PK/FK/chronology constraint failure");
    }
    await client.query("ROLLBACK");
    assert.equal(
      Number(
        (await client.query("SELECT count(*) FROM requests")).rows[0].count,
      ),
      48,
    );
    console.log(
      JSON.stringify(
        {
          result: "PASS",
          checks: [
            "SQL independent KPI comparison",
            "48 canonical / 96 raw rows",
            "PK rejection",
            "FK rejection",
            "chronology rejection",
            "ROW_NUMBER latest-source selection over two historical updates",
            "UUID ID accepted with event FK; malformed ID rejected; rollback preserves 48 fixtures",
          ],
          reference: sql,
          api: actual,
        },
        null,
        2,
      ),
    );
  } else if (mode === "explain") {
    const result = await client.query(
      "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM requests WHERE request_id=$1",
      ["REQ-0024"],
    );
    const overdue = await client.query(
      "EXPLAIN (ANALYZE, BUFFERS) " +
        (await readFile("db/queries/overdue.sql", "utf8")),
      [SNAPSHOT],
    );
    const evidence = [...result.rows, ...overdue.rows]
      .map((r) => r["QUERY PLAN"])
      .join("\n");
    await mkdir("docs/evidence", { recursive: true });
    await writeFile("docs/evidence/postgres-explain.txt", evidence + "\n");
    console.log(evidence);
  } else throw new Error("Expected migrate, seed, test or explain");
} finally {
  await client.end();
}
