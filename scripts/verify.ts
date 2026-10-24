import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
const run = promisify(execFile),
  pnpm = process.env.npm_execpath;
if (!pnpm || !/[cm]?js$/.test(pnpm))
  throw new Error("Run this through pnpm verify");
await mkdir("docs/evidence", { recursive: true });
const results = [];
for (const command of [
  "lint",
  "typecheck",
  "test",
  "build",
  "test:http",
  "azure:batch",
]) {
  const start = new Date().toISOString();
  let code = 0;
  let output: string;
  try {
    const r = await run(process.execPath, [pnpm, "run", command], {
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    output = r.stdout + r.stderr;
  } catch (e) {
    const error = e as Error & {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    code = typeof error.code === "number" ? error.code : 1;
    output = (error.stdout ?? "") + (error.stderr ?? "") + "\n" + error.message;
  }
  const path = `docs/evidence/${command.replaceAll(":", "-")}.txt`;
  await writeFile(
    path,
    `Timestamp: ${start}\nCommand: pnpm ${command}\nExit: ${code}\n\n${output}`,
  );
  results.push({ command: `pnpm ${command}`, code, evidence: path });
  console.log(`${command}: ${code === 0 ? "PASS" : "FAIL"} (${path})`);
}
await writeFile(
  "docs/evidence/verification.json",
  JSON.stringify(
    { timestamp: new Date().toISOString(), node: process.version, results },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => r.code !== 0)) process.exitCode = 1;
