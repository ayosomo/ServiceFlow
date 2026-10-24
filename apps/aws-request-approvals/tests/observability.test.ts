import { afterEach, expect, it, vi } from "vitest";
import { execution, type RequestMetric } from "../src/execution.js";
import { MemoryRepository, type Call } from "../src/service.js";
import { gatewayHandler } from "../src/lambda.js";

afterEach(() => vi.unstubAllEnvs());
const create: Call = {
  method: "POST",
  path: "/requests",
  actor: { id: "synthetic-sensitive-principal", roles: ["requester"] },
  correlationId: "server_request_001",
  idempotencyKey: "sensitive_key_001",
  body: JSON.stringify({
    requestId: "REQ-0700",
    customerId: "SYN-700",
    summary: "Sensitive synthetic input never logged",
    ownerTeam: "Operations",
    priority: "HIGH",
    submittedAt: "2026-10-01T00:00:00.000Z",
    targetAt: "2026-10-30T00:00:00.000Z",
    approvalRequired: true,
  }),
};

it("BA-009 correlates the response/audit with a bounded metric and omits request values", async () => {
  const repo = new MemoryRepository(),
    metrics: RequestMetric[] = [];
  let time = 10;
  const result = await execution(
    repo,
    (m) => metrics.push(m),
    () => (time += 7),
  )(create);
  expect(result.statusCode).toBe(201);
  expect(result.headers["x-correlation-id"]).toBe("server_request_001");
  expect((await repo.get("REQ-0700"))?.events[0]?.correlationId).toBe(
    "server_request_001",
  );
  expect(metrics).toEqual([
    {
      event: "request_completed",
      correlationId: "server_request_001",
      operation: "create",
      statusCode: 201,
      durationMs: 7,
      outcome: "success",
    },
  ]);
  for (const sensitive of [
    "synthetic-sensitive-principal",
    "sensitive_key_001",
    "Sensitive synthetic input",
    "REQ-0700",
    "SYN-700",
  ])
    expect(JSON.stringify(metrics)).not.toContain(sensitive);
});

it("BA-009 replaces invalid correlation IDs and never logs unknown caller paths", async () => {
  const metrics: RequestMetric[] = [];
  const result = await execution(new MemoryRepository(), (m) =>
    metrics.push(m),
  )({
    ...create,
    method: "GET",
    path: "/private-input-do-not-log",
    correlationId: "private-value\nforged-entry",
  });
  expect(result.statusCode).toBe(404);
  expect(result.headers["x-correlation-id"]).toMatch(/^[a-f0-9-]{36}$/);
  expect(metrics[0]).toMatchObject({
    operation: "unknown",
    outcome: "client_rejected",
    correlationId: result.headers["x-correlation-id"],
  });
  expect(JSON.stringify(metrics)).not.toContain("private");
});

it("BA-009 reports dependency failure as server error without logging exception details", async () => {
  const repo = new MemoryRepository(),
    metrics: RequestMetric[] = [];
  repo.get = async () => {
    throw new Error("private-provider-detail");
  };
  const result = await execution(repo, (m) => metrics.push(m))({
    ...create,
    method: "GET",
    path: "/requests/REQ-0700",
  });
  expect(result.statusCode).toBe(503);
  expect(metrics[0]).toMatchObject({
    operation: "read",
    outcome: "server_error",
    statusCode: 503,
  });
  expect(JSON.stringify(metrics)).not.toContain("private-provider-detail");
});

it("BA-009 logging failure cannot turn a committed creation into an error or extra event", async () => {
  const repo = new MemoryRepository();
  const run = execution(repo, () => {
    throw new Error("unavailable log sink");
  });
  expect((await run(create)).statusCode).toBe(201);
  expect((await run(create)).statusCode).toBe(201);
  expect((await repo.get("REQ-0700"))?.events).toHaveLength(1);
});

it("BA-009 Lambda adapter uses verified-context identity and ignores caller correlation/principal headers", async () => {
  vi.stubEnv("REQUESTER_ARNS", "synthetic-gateway-principal");
  const metrics: RequestMetric[] = [],
    repo = new MemoryRepository();
  const run = gatewayHandler(repo, (m) => metrics.push(m));
  const event = {
    rawPath: "/requests",
    body: Buffer.from(create.body!).toString("base64"),
    isBase64Encoded: true,
    headers: {
      "idempotency-key": create.idempotencyKey,
      "x-correlation-id": "caller-forged-id",
      "x-principal": "synthetic-gateway-principal",
    },
    requestContext: {
      http: { method: "POST" },
      requestId: "server_gateway_001",
    },
  };
  expect((await run(event)).statusCode).toBe(403);
  expect(repo.records.size).toBe(0);
  const result = await run({
    ...event,
    requestContext: {
      ...event.requestContext,
      authorizer: { iam: { userArn: "synthetic-gateway-principal" } },
    },
  });
  expect(result.statusCode).toBe(201);
  expect(result.headers["x-correlation-id"]).toBe("server_gateway_001");
  expect(metrics.map((m) => m.outcome)).toEqual(["client_rejected", "success"]);
  expect(JSON.stringify(metrics)).not.toContain("caller-forged-id");
  expect(JSON.stringify(metrics)).not.toContain("synthetic-gateway-principal");
});

it("BA-009 liveness is explicitly independent of a failed persistence dependency", async () => {
  const repo = new MemoryRepository();
  repo.get = async () => {
    throw new Error("offline");
  };
  const metrics: RequestMetric[] = [],
    run = execution(repo, (m) => metrics.push(m));
  expect(
    (await run({ ...create, method: "GET", path: "/healthz" })).statusCode,
  ).toBe(200);
  expect(
    (await run({ ...create, method: "GET", path: "/requests/REQ-0700" }))
      .statusCode,
  ).toBe(503);
  expect(metrics.map((m) => m.operation)).toEqual(["health", "read"]);
});
