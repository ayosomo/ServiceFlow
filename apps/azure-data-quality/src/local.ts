import { readFile, mkdir, writeFile } from "node:fs/promises";
import { MemoryStore, processBatch } from "./pipeline.js";
const store = new MemoryStore();
for (const source of ["supplier", "crm"])
  await store.putOnce(
    `incoming/demo/${source}.csv`,
    await readFile(`packages/fixtures/data/${source}.csv`, "utf8"),
  );
const report = await processBatch(store, "demo");
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/azure-local-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.metrics, null, 2));
