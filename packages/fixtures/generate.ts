import { mkdir, writeFile } from "node:fs/promises";
import { fixtures, SEED } from "./src.js";
import { reconcile, kpis, SNAPSHOT } from "../domain/src/index.js";
const f = fixtures();
await mkdir("packages/fixtures/data", { recursive: true });
for (const [name, data] of Object.entries({
  ...f,
  manifest: {
    seed: SEED,
    asOf: SNAPSHOT,
    allDataSynthetic: true,
    requestIdContract: "legacy-or-uuid-v1",
    reconciliationRuleVersion: "2",
  },
  findings: reconcile(f.crm, f.supplier),
  kpis: kpis(f.crm, reconcile(f.crm, f.supplier)),
}))
  await writeFile(
    `packages/fixtures/data/${name}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
function csv(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0]!);
  return (
    [
      keys.join(","),
      ...rows.map((r) =>
        keys
          .map((k) => '"' + String(r[k] ?? "").replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\n") + "\n"
  );
}
await writeFile("packages/fixtures/data/crm.csv", csv(f.crm));
await writeFile(
  "packages/fixtures/data/supplier.csv",
  csv(f.supplier.map((r) => ({ ...r }))),
);
console.log(
  "Generated immutable-seed snapshots: 48 requests, eight intentionally affected CRM rows.",
);
