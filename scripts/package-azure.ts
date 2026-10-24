import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
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
await writeFile(
  resolve(target, "package.json"),
  JSON.stringify(
    {
      name: "serviceflow-quality-runtime",
      version: "0.1.0",
      private: true,
      main: "function.cjs",
      engines: { node: "22.x" },
      dependencies: {
        "@azure/functions": root.dependencies["@azure/functions"],
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Staged Azure package in ${target}. Install its exact production dependency before ZIP deployment. No cloud action performed.`,
);
