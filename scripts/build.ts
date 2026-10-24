import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
for (const [app, entry] of [
  ["aws-request-approvals", "lambda"],
  ["azure-data-quality", "function"],
  ["gcp-delivery-insights", "server"],
]) {
  await build({
    entryPoints: [`apps/${app}/src/${entry}.ts`],
    outfile: `apps/${app}/dist/${entry}.${app === "aws-request-approvals" ? "js" : "cjs"}`,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    ...(app === "gcp-delivery-insights"
      ? { packages: "external" as const }
      : app === "azure-data-quality"
        ? { external: ["@azure/functions"] }
        : {}),
    sourcemap: true,
  });
  if (app === "aws-request-approvals")
    await writeFile(
      `apps/${app}/dist/package.json`,
      JSON.stringify({ type: "commonjs" }),
    );
}
console.log("Built AWS, Azure and GCP Node 22 bundles.");
