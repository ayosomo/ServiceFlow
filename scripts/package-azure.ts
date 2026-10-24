import { mkdir, copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const target = resolve(process.env.LAB_WORK_DIR ?? "work", "azure-package");
await mkdir(target, { recursive: true });
await copyFile(
  "apps/azure-data-quality/dist/function.cjs",
  resolve(target, "function.cjs"),
);
await copyFile(
  "apps/azure-data-quality/host.json",
  resolve(target, "host.json"),
);
const root = JSON.parse(await readFile("package.json", "utf8"));
const runtime = "apps/azure-data-quality/runtime";
const manifest = JSON.parse(await readFile(`${runtime}/package.json`, "utf8"));
if (
  manifest.dependencies["@azure/functions"] !==
  root.dependencies["@azure/functions"]
)
  throw new Error(
    "Azure runtime manifest must match the root Functions dependency",
  );
for (const file of ["package.json", "package-lock.json"])
  await copyFile(`${runtime}/${file}`, resolve(target, file));
console.log(
  `Staged Azure package in ${target}. Run npm ci --omit=dev --ignore-scripts there, then python scripts/package-azure.py from repository root. No cloud action performed.`,
);
