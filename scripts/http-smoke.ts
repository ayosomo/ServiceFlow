import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { generatedRequestIdSchema } from "../packages/domain/src/index.js";
const token = randomBytes(32).toString("hex");
const approverToken = randomBytes(32).toString("hex");
const aws = spawn(
  process.execPath,
  ["--import", "tsx", "apps/aws-request-approvals/src/local.ts"],
  {
    windowsHide: true,
    env: {
      ...process.env,
      LOCAL_API_TOKEN: token,
      LOCAL_APPROVER_TOKEN: approverToken,
    },
    stdio: "ignore",
  },
);
const gcp = spawn(
  process.execPath,
  ["apps/gcp-delivery-insights/dist/server.cjs"],
  {
    windowsHide: true,
    env: {
      ...process.env,
      MODE: "local",
      PORT: "3103",
      BIND_HOST: "127.0.0.1",
      LOCAL_API_TOKEN: token,
    },
    stdio: "ignore",
  },
);
const evidence: string[] = [
  `Real loopback HTTP, fake/fixture persistence. Not cloud: ${new Date().toISOString()}`,
];
async function wait(url: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(200) });
      if (r.status === 403) return;
    } catch {
      /* server starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Local HTTP startup timeout");
}
const request = async (
  base: string,
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  identityToken = token,
) => {
  const response = await fetch(base + path, {
    method,
    headers: {
      authorization: `Bearer ${identityToken}`,
      "content-type": "application/json",
      ...(base === "http://127.0.0.1:3101"
        ? { "x-correlation-id": "caller_value_must_not_be_trusted" }
        : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = { status: response.status, body: await response.json() };
  const correlationId = response.headers.get("x-correlation-id");
  if (base === "http://127.0.0.1:3101") {
    assert.match(correlationId ?? "", /^[A-Za-z0-9_-]{1,100}$/);
    assert.notEqual(correlationId, "caller_value_must_not_be_trusted");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  evidence.push(
    JSON.stringify({
      method,
      path,
      ...result,
      ...(correlationId ? { correlationId } : {}),
    }),
  );
  return result;
};
try {
  await wait("http://127.0.0.1:3101/healthz");
  await wait("http://127.0.0.1:3103/health");
  for (const [port, path] of [
    [3101, "/healthz"],
    [3103, "/health"],
  ] as const) {
    const r = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(r.status, 403);
    evidence.push(`Anonymous loopback ${port} health: 403`);
  }
  assert.deepEqual(await request("http://127.0.0.1:3103", "/health"), {
    status: 200,
    body: { status: "ok" },
  });
  const base = "http://127.0.0.1:3101";
  const payload = {
    requestId: "REQ-0900",
    customerId: "SYN-900",
    summary: "Synthetic HTTP smoke request",
    ownerTeam: "Operations",
    priority: "HIGH",
    submittedAt: "2026-10-01T00:00:00.000Z",
    targetAt: "2026-10-30T00:00:00.000Z",
    approvalRequired: true,
  };
  assert.equal(
    (await request(base, "/requests", "POST", payload, "smoke_create")).status,
    201,
  );
  const body = {
    decision: "APPROVED",
    version: 1,
    reason: "Synthetic smoke approval",
  };
  assert.equal(
    (
      await request(
        base,
        "/requests/REQ-0900/decision",
        "POST",
        body,
        "smoke_self_denial",
      )
    ).status,
    403,
  );
  const deniedState = await request(base, "/requests/REQ-0900");
  assert.equal(
    (deniedState.body as { request: { version: number } }).request.version,
    1,
  );
  assert.equal((deniedState.body as { events: unknown[] }).events.length, 1);
  assert.equal(
    (
      await request(
        base,
        "/requests/REQ-0900/decision",
        "POST",
        body,
        "smoke_decision",
        approverToken,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        base,
        "/requests/REQ-0900/decision",
        "POST",
        body,
        "smoke_decision",
        approverToken,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        base,
        "/requests/REQ-0900/decision",
        "POST",
        body,
        "smoke_stale",
        approverToken,
      )
    ).status,
    409,
  );
  const reread = await request(base, "/requests/REQ-0900");
  assert.equal((reread.body as { events: unknown[] }).events.length, 2);
  const noId = { ...payload } as Partial<typeof payload>;
  delete noId.requestId;
  const generated = await request(
    base,
    "/requests",
    "POST",
    noId,
    "http_uuid_create",
  );
  assert.equal(generated.status, 201);
  const uuid = generatedRequestIdSchema.parse(
    (generated.body as { requestId: string }).requestId,
  );
  assert.deepEqual(
    await request(base, "/requests", "POST", noId, "http_uuid_create"),
    generated,
  );
  assert.equal((await request(base, `/requests/${uuid}`)).status, 200);
  assert.equal(
    (
      await request(
        base,
        `/requests/${uuid}/decision`,
        "POST",
        body,
        "http_uuid_decision",
        approverToken,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        base,
        `/requests/${uuid}/decision`,
        "POST",
        body,
        "http_uuid_decision",
        approverToken,
      )
    ).status,
    200,
  );
  assert.equal(
    ((await request(base, `/requests/${uuid}`)).body as { events: unknown[] })
      .events.length,
    2,
  );
  const metrics = await request(
    "http://127.0.0.1:3103",
    "/kpis?asOf=2026-10-23",
  );
  assert.equal(metrics.status, 200);
  assert.equal(
    (metrics.body as { overdue: { count: number } }).overdue.count,
    9,
  );
  assert.equal(
    (await request("http://127.0.0.1:3103", "/requests/REQ-0013/insight"))
      .status,
    200,
  );
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    process.env.HTTP_EVIDENCE_FILE ?? "docs/evidence/http-local-smoke.txt",
    evidence.join("\n") + "\nPASS\n",
  );
  console.log(
    "PASS: actual loopback HTTP intake, requester decision denial with unchanged audit/state, distinct approver/replay, stale-version denial, audit reread and compiled GCP KPI service.",
  );
} finally {
  aws.kill();
  gcp.kill();
}
