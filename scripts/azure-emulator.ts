import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const run = promisify(execFile),
  location = resolve(process.env.LAB_WORK_DIR ?? "work", "azurite");
await mkdir(location, { recursive: true });
const emulator = spawn(
  process.execPath,
  [
    "node_modules/azurite/dist/src/azurite.js",
    "--location",
    location,
    "--blobHost",
    "127.0.0.1",
    "--queueHost",
    "127.0.0.1",
    "--tableHost",
    "127.0.0.1",
    "--skipApiVersionCheck",
    "--silent",
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
let logs = "";
emulator.stdout.on("data", (d) => {
  logs += String(d);
});
emulator.stderr.on("data", (d) => {
  logs += String(d);
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (emulator.exitCode !== null)
      throw new Error("Azurite startup failed: " + logs);
    try {
      await fetch("http://127.0.0.1:10000/", {
        signal: AbortSignal.timeout(200),
      });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!ready) throw new Error("Azurite startup timeout");
  const result = await run(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.integration.config.ts",
      "azurite.integration",
    ],
    { timeout: 60000, maxBuffer: 1024 * 1024 },
  );
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/azurite-native.txt",
    `Native Azurite, not Docker/Functions host: ${new Date().toISOString()}\nEXIT: 0\n${result.stdout}${result.stderr}\n${logs}`,
  );
  console.log(result.stdout + result.stderr);
} finally {
  emulator.kill();
}
