import { BlobServiceClient } from "@azure/storage-blob";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const storage = BlobServiceClient.fromConnectionString(
  "UseDevelopmentStorage=true",
);
for (const container of ["incoming", "results"])
  await storage.getContainerClient(container).createIfNotExists();
const batchId = `host-${Date.now()}`;
for (const source of ["supplier", "crm"]) {
  const bytes = await readFile(`packages/fixtures/data/${source}.csv`);
  await storage
    .getContainerClient("incoming")
    .getBlockBlobClient(`${batchId}/${source}.csv`)
    .upload(bytes, bytes.length);
}
const summary = storage
  .getContainerClient("results")
  .getBlockBlobClient(`${batchId}/summary.json`);
let report: Record<string, unknown> | undefined;
for (let i = 0; i < 60; i++) {
  try {
    report = JSON.parse((await summary.downloadToBuffer()).toString("utf8"));
    break;
  } catch (e) {
    if (
      !e ||
      typeof e !== "object" ||
      !("statusCode" in e) ||
      e.statusCode !== 404
    )
      throw e;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
assert.ok(report, "Functions host did not produce a report within 60 seconds");
const metrics = report.metrics as {
  totalRecords: number;
  exceptionBacklog: { count: number };
};
assert.equal(metrics.totalRecords, 48);
assert.equal(metrics.exceptionBacklog.count, 12);
const evidence = {
  timestamp: new Date().toISOString(),
  kind: "Actual local Azure Functions v4 blob-trigger host + Azurite, not Azure deployment",
  batchId,
  report,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/azure-functions-host.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  "PASS: actual Functions host triggered from CRM blob and persisted 48-record / 12-finding report.",
);
