import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fixtures } from "../../../packages/fixtures/src.js";
import {
  MemoryStore,
  processBatch,
  Retryable,
  BatchConflict,
  csvInput,
  RULE_VERSION,
} from "../src/pipeline.js";
async function ready() {
  const store = new MemoryStore();
  for (const s of ["supplier", "crm"])
    await store.putOnce(
      `incoming/demo/${s}.csv`,
      readFileSync(`packages/fixtures/data/${s}.csv`, "utf8"),
    );
  return store;
}
it("BA-003 preserves sources, reports eight affected rows and replays deterministically", async () => {
  const store = await ready(),
    before = await store.get("incoming/demo/crm.csv");
  const report = await processBatch(store, "demo");
  expect(report.metrics.totalRecords).toBe(48);
  expect(report.metrics.qualityPassRate.numerator).toBe(41);
  expect(report.metrics.exceptionBacklog).toEqual({
    count: 12,
    critical: 8,
    review: 4,
  });
  expect(await processBatch(store, "demo")).toEqual(report);
  expect(await store.get("incoming/demo/crm.csv")).toEqual(before);
  expect(await store.get("results/demo/findings.json")).not.toBeNull();
});
it("waits for missing input rather than producing PASS", async () => {
  const store = new MemoryStore();
  await expect(processBatch(store, "demo")).rejects.toThrow(Retryable);
  expect(store.blobs.size).toBe(0);
});
it("rejects malformed CSV, duplicate headers, oversized files, too many rows and missing columns", () => {
  for (const text of [
    "a,a\n1,2",
    "requestId\nREQ-0001",
    "x".repeat(1048577),
    'requestId,supplierUpdatedAt,supplierMilestone,supplierTargetAt\n"unclosed',
  ])
    expect(() => csvInput(text, "SUPPLIER")).toThrow();
  expect(() =>
    csvInput(
      "requestId,supplierUpdatedAt,supplierMilestone,supplierTargetAt\n" +
        Array(201).fill("r,x,y,z").join("\n"),
      "SUPPLIER",
    ),
  ).toThrow();
});
it("rejects reuse of batch ID for changed data", async () => {
  const store = await ready();
  await processBatch(store, "demo");
  store.blobs.set("incoming/demo/crm.csv", {
    text: readFileSync("packages/fixtures/data/crm.csv", "utf8") + "\n",
    etag: "changed",
  });
  await expect(processBatch(store, "demo")).rejects.toThrow(BatchConflict);
});
it("concurrent retry creates one committed result", async () => {
  const store = await ready();
  const [a, b] = await Promise.all([
    processBatch(store, "demo"),
    processBatch(store, "demo"),
  ]);
  expect(a).toEqual(b);
  expect(
    [...store.blobs.keys()].filter((k) => k.endsWith("summary.json")),
  ).toHaveLength(1);
});
it("recovers after failure before commit without returning false success", async () => {
  const store = await ready(),
    put = store.putOnce.bind(store);
  let fail = true;
  store.putOnce = async (path, text) => {
    if (path.endsWith("summary.json") && fail) {
      fail = false;
      throw new Error("provider timeout");
    }
    return put(path, text);
  };
  await expect(processBatch(store, "demo")).rejects.toThrow("provider timeout");
  expect(await store.get("results/demo/summary.json")).toBeNull();
  expect((await processBatch(store, "demo")).metrics.totalRecords).toBe(48);
});
it("repairs the convenience findings file after a post-commit failure", async () => {
  const store = await ready(),
    put = store.putOnce.bind(store);
  let fail = true;
  store.putOnce = async (path, text) => {
    if (path === "results/demo/findings.json" && fail) {
      fail = false;
      throw new Error("output timeout");
    }
    return put(path, text);
  };
  await expect(processBatch(store, "demo")).rejects.toThrow("output timeout");
  expect(await store.get("results/demo/summary.json")).not.toBeNull();
  expect((await processBatch(store, "demo")).metrics.totalRecords).toBe(48);
  expect(await store.get("results/demo/findings.json")).not.toBeNull();
});

it("keeps an earlier rule-version summary immutable instead of relabelling it as current", async () => {
  const store = await ready(),
    report = await processBatch(store, "demo");
  expect(report.ruleVersion).toBe(RULE_VERSION);
  const old = JSON.stringify({ ...report, ruleVersion: "1" });
  store.blobs.set("results/demo/summary.json", {
    text: old,
    etag: "synthetic-old-rule",
  });
  await expect(processBatch(store, "demo")).rejects.toThrow(BatchConflict);
  expect((await store.get("results/demo/summary.json"))?.text).toBe(old);
});

it("isolates current rule findings from an older orphan left before summary commit", async () => {
  const store = await ready();
  const report = await processBatch(store, "demo");
  // Model the pre-versioned immutable path using the same source bytes, then retry
  // an uncommitted batch under the new rules. It must not reuse old findings.
  store.blobs.delete("results/demo/summary.json");
  store.blobs.delete("results/demo/findings.json");
  store.blobs.delete(
    `results/demo/rules-${RULE_VERSION}/${report.sourceHash}/findings.json`,
  );
  const legacyPath = `results/demo/${report.sourceHash}/findings.json`;
  await store.putOnce(legacyPath, "[]");
  const current = await processBatch(store, "demo");
  expect((await store.get(legacyPath))?.text).toBe("[]");
  expect(
    JSON.parse(
      (await store.get(
        `results/demo/rules-${RULE_VERSION}/${report.sourceHash}/findings.json`,
      ))!.text,
    ),
  ).toEqual(current.findings);
  expect(current.findings).toHaveLength(12);
});

it("ingests a UUID reference through CSV without treating it as dirty or unidentified", async () => {
  const id = "REQ-637f6ec2-85b0-42ce-9f30-a295e3be68e1",
    row = { ...fixtures().base[0]!, requestId: id };
  const supplier = {
    requestId: id,
    supplierUpdatedAt: row.submittedAt,
    supplierMilestone: "Synthetic",
    supplierTargetAt: row.targetAt,
  };
  const csv = (r: Record<string, unknown>) =>
    Object.keys(r).join(",") +
    "\n" +
    Object.values(r)
      .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
      .join(",") +
    "\n";
  const store = new MemoryStore();
  await store.putOnce("incoming/uuid/crm.csv", csv(row));
  await store.putOnce("incoming/uuid/supplier.csv", csv(supplier));
  const report = await processBatch(store, "uuid");
  expect(report.ruleVersion).toBe(RULE_VERSION);
  expect(report.findings).toEqual([]);
  expect(report.metrics).toMatchObject({
    totalRecords: 1,
    unidentifiable: 0,
    qualityPassRate: { numerator: 1, denominator: 1 },
  });
});
