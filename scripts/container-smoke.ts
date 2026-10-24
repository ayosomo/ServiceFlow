import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { Firestore } from "@google-cloud/firestore";
import { fixtures } from "../packages/fixtures/src.js";
import { reconcile, kpis } from "../packages/domain/src/index.js";
const run = promisify(execFile),
  name = `serviceflow-insights-smoke-${Date.now()}`,
  token = randomBytes(32).toString("hex");
const f = fixtures(),
  findings = reconcile(f.crm, f.supplier),
  snapshot = {
    requests: f.crm,
    findings,
    sourceHash: createHash("sha256")
      .update(JSON.stringify([f.crm, f.supplier]))
      .digest("hex"),
  };
const firestore = new Firestore({
  projectId: "serviceflow-local",
  host: "127.0.0.1:58085",
  ssl: false,
});
const document = firestore.collection("serviceflowSnapshots").doc("2026-10-23");
// Hardcoded emulator only; this script cannot target a chargeable cloud endpoint.
await document.set(snapshot);
const docker = (args: string[]) =>
  run("docker", args, {
    windowsHide: true,
    timeout: 60000,
    env: { ...process.env, LOCAL_API_TOKEN: token },
  });
let started = false;
try {
  await docker([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    "serviceflow-cloud-labs_default",
    "--memory",
    "384m",
    "-p",
    "127.0.0.1:58080:8080",
    "-e",
    "MODE=local",
    "-e",
    "LOCAL_API_TOKEN",
    "-e",
    "GOOGLE_CLOUD_PROJECT=serviceflow-local",
    "-e",
    "FIRESTORE_EMULATOR_HOST=firestore:8085",
    "serviceflow-insights:local",
  ]);
  started = true;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://127.0.0.1:58080/healthz", {
        signal: AbortSignal.timeout(500),
      });
      if (r.status === 403) {
        ready = true;
        break;
      }
    } catch {
      /* cold start */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, "Container did not start");
  const user = (
    await docker(["inspect", "--format", "{{.Config.User}}", name])
  ).stdout.trim();
  assert.equal(user, "node");
  const response = await fetch("http://127.0.0.1:58080/kpis?asOf=2026-10-23", {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200);
  const metrics = await response.json();
  assert.deepEqual(metrics, {
    ...kpis(f.crm, findings),
    sourceHash: snapshot.sourceHash,
  });
  const bad = await fetch("http://127.0.0.1:58080/kpis", {
    headers: { authorization: "Bearer invalid" },
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(bad.status, 403);
  const image = (
    await docker([
      "image",
      "inspect",
      "--format",
      "{{.Id}}",
      "serviceflow-insights:local",
    ])
  ).stdout.trim();
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/gcp-container.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        kind: "Actual Docker Node 22 non-root API -> Firestore emulator -> HTTP response. Not Google Cloud deployment.",
        user,
        image,
        anonymousStatus: 403,
        invalidTokenStatus: bad.status,
        authenticatedStatus: response.status,
        metrics,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: non-root container, anonymous/invalid token 403 and authenticated API -> Firestore emulator -> exact KPI response.",
  );
} finally {
  if (started) await docker(["rm", "-f", name]);
  await document.delete();
  await firestore.terminate();
}
