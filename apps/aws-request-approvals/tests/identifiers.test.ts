import { expect, it } from "vitest";
import { api, MemoryRepository, type Call } from "../src/service.js";
import { execution, type RequestMetric } from "../src/execution.js";
import { fixtures } from "../../../packages/fixtures/src.js";
import {
  requestSchema,
  requestIdSchema,
  kpis,
  reconcile,
  SNAPSHOT,
} from "../../../packages/domain/src/index.js";
import { createApp } from "../../gcp-delivery-insights/src/app.js";
import { FixtureRepository } from "../../gcp-delivery-insights/src/repository.js";

const id = "REQ-637f6ec2-85b0-42ce-9f30-a295e3be68e1";
const payload = {
  customerId: "SYN-601",
  summary: "Synthetic generated identifier request",
  ownerTeam: "Operations",
  priority: "HIGH",
  submittedAt: "2026-10-01T00:00:00.000Z",
  targetAt: "2026-10-20T00:00:00.000Z",
  approvalRequired: true,
};
const create: Call = {
  method: "POST",
  path: "/requests",
  actor: { id: "synthetic-requester", roles: ["requester"] },
  idempotencyKey: "uuid_create_001",
  body: JSON.stringify(payload),
};
const decision = (requestId: string): Call => ({
  method: "POST",
  path: `/requests/${requestId}/decision`,
  actor: { id: "synthetic-approver", roles: ["approver"] },
  idempotencyKey: "uuid_decision_001",
  body: JSON.stringify({
    decision: "APPROVED",
    reason: "Synthetic independent decision",
    version: 1,
  }),
});

it("BA-011 generates a UUID request reference, rereads/decides it and replays one original ID", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  const a = await run(create),
    b = await run(create);
  expect(a.statusCode).toBe(201);
  expect(b).toEqual(a);
  const requestId = (a.body as { requestId: string }).requestId;
  expect(requestId).toMatch(/^REQ-[a-f0-9-]{36}$/);
  expect(
    (
      await run({
        method: "GET",
        path: `/requests/${requestId}`,
        actor: create.actor,
      })
    ).statusCode,
  ).toBe(200);
  expect((await run(decision(requestId))).statusCode).toBe(200);
  expect((await run(decision(requestId))).statusCode).toBe(200);
  expect((await repo.get(requestId))?.events).toHaveLength(2);
});

it("BA-011 keeps legacy IDs valid and returns conflict without overwrite on a forced generated collision", async () => {
  const repo = new MemoryRepository();
  let generated = 0;
  const run = api(
    repo,
    () => SNAPSHOT,
    () => {
      generated++;
      return id;
    },
  );
  expect((await run(create)).statusCode).toBe(201);
  expect((await run(create)).statusCode).toBe(201);
  expect(generated).toBe(1);
  const before = await repo.get(id);
  expect(
    (await run({ ...create, idempotencyKey: "uuid_collision_001" })).statusCode,
  ).toBe(409);
  expect(await repo.get(id)).toEqual(before);
  expect(
    (
      await run({
        ...create,
        idempotencyKey: "legacy_create_001",
        body: JSON.stringify({ ...payload, requestId: "REQ-0601" }),
      })
    ).statusCode,
  ).toBe(201);
});

it("BA-011 treats generator failure as server unavailability and writes nothing", async () => {
  const repo = new MemoryRepository();
  expect(
    (
      await api(
        repo,
        () => SNAPSHOT,
        () => "REQ-1234",
      )(create)
    ).statusCode,
  ).toBe(503);
  expect(repo.records.size).toBe(0);
  expect(repo.receipts.size).toBe(0);
});

it.each([
  "REQ-not-a-uuid",
  id.toUpperCase(),
  id.replace("-42ce-", "-32ce-"),
  id.replace("-9f30-", "-7f30-"),
  "REQ-12345",
])("BA-011 rejects malformed/noncanonical request ID %s", async (requestId) => {
  expect(requestIdSchema.safeParse(requestId).success).toBe(false);
  expect(
    (
      await api(new MemoryRepository())({
        ...create,
        body: JSON.stringify({ ...payload, requestId }),
      })
    ).statusCode,
  ).toBe(400);
});

it("BA-011 includes UUIDs in reconciliation/KPI eligibility and GCP drill-down without changing fixtures", async () => {
  const request = requestSchema.parse({
    ...payload,
    requestId: id,
    status: "SUBMITTED",
    approverId: null,
    version: 1,
  });
  const supplier = [
    {
      requestId: id,
      supplierUpdatedAt: SNAPSHOT,
      supplierMilestone: "Synthetic",
      supplierTargetAt: payload.targetAt,
    },
  ];
  const findings = reconcile([request], supplier);
  expect(findings).toEqual([]);
  expect(kpis([request], findings)).toMatchObject({
    totalRecords: 1,
    unidentifiable: 0,
    qualityPassRate: { numerator: 1, denominator: 1 },
    overdue: { count: 1 },
  });
  const app = createApp(
    new FixtureRepository({
      requests: [request],
      findings,
      sourceHash: "synthetic-uuid-test",
    }),
    async () => "synthetic-manager",
  );
  try {
    expect((await app.inject(`/requests/${id}/insight`)).json()).toMatchObject({
      requestId: id,
      qualityStatus: "PASS",
      readinessStatus: "BLOCKED",
    });
  } finally {
    await app.close();
  }
  expect(fixtures().base).toHaveLength(48);
  expect(
    kpis(fixtures().crm, reconcile(fixtures().crm, fixtures().supplier)).overdue
      .count,
  ).toBe(9);
});

it("BA-011 classifies UUID read/decision metrics without logging the actual identifier", async () => {
  const repo = new MemoryRepository();
  await api(repo)({
    ...create,
    body: JSON.stringify({ ...payload, requestId: id }),
  });
  const metrics: RequestMetric[] = [],
    run = execution(repo, (m) => metrics.push(m));
  await run({ method: "GET", path: `/requests/${id}`, actor: create.actor });
  await run(decision(id));
  expect(metrics.map((m) => m.operation)).toEqual(["read", "decision"]);
  expect(JSON.stringify(metrics)).not.toContain(id);
});
