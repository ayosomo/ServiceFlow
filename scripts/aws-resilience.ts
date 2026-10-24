import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  MemoryRepository,
  type Repository,
  type Call,
} from "../apps/aws-request-approvals/src/service.js";
import { DynamoRepository } from "../apps/aws-request-approvals/src/dynamodb.js";
import {
  execution,
  type RequestMetric,
} from "../apps/aws-request-approvals/src/execution.js";

const mode = process.argv[2] ?? "memory";
assert(
  ["memory", "dynamodb-local"].includes(mode),
  "Use memory or dynamodb-local; cloud endpoints are unsupported",
);
const metrics: RequestMetric[] = [];
const observations: {
  scenario: string;
  statuses: number[];
  assertion: string;
}[] = [];
const startedAtUTC = new Date().toISOString();
const requester: Call["actor"] = {
  id: "synthetic-resilience-requester",
  roles: ["requester"],
};
const approver: Call["actor"] = {
  id: "synthetic-resilience-approver",
  roles: ["approver"],
};
const create = (id: string): Call => ({
  method: "POST",
  path: "/requests",
  actor: requester,
  idempotencyKey: `create_${id}`,
  body: JSON.stringify({
    requestId: id,
    customerId: "SYN-760",
    summary: "Synthetic local fault exercise",
    ownerTeam: "Operations",
    priority: "HIGH",
    submittedAt: "2026-10-01T00:00:00.000Z",
    targetAt: "2026-10-30T00:00:00.000Z",
    approvalRequired: true,
  }),
});
const decision = (id: string, key: string, value = "APPROVED"): Call => ({
  method: "POST",
  path: `/requests/${id}/decision`,
  actor: approver,
  idempotencyKey: key,
  body: JSON.stringify({
    decision: value,
    reason: "Synthetic fault exercise decision",
    version: 1,
  }),
});
let client: DynamoDBClient | undefined;
let table: string | undefined;
let base: Repository = new MemoryRepository();
let cleanupPassed = false;
let tableCreated = false;
let failure: unknown;
let invocationCount = 0;
try {
  if (mode === "dynamodb-local") {
    // Endpoint and dummy credentials are fixed: this helper cannot target AWS.
    client = new DynamoDBClient({
      endpoint: "http://127.0.0.1:58000",
      region: "local",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
      maxAttempts: 1,
    });
    table = `serviceflow-resilience-local-${Date.now()}`;
    await client.send(
      new CreateTableCommand({
        TableName: table,
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      }),
    );
    tableCreated = true;
    base = new DynamoRepository(table, DynamoDBDocumentClient.from(client));
  }
  let available = true,
    loseAcknowledgement = false;
  const check = () => {
    if (!available)
      throw Object.assign(new Error("Synthetic injected provider failure"), {
        name: "ProvisionedThroughputExceededException",
      });
  };
  const faulted: Repository = {
    get: async (id) => {
      check();
      return base.get(id);
    },
    receipt: async (key) => {
      check();
      return base.receipt(key);
    },
    save: async (...args) => {
      check();
      await base.save(...args);
      if (loseAcknowledgement) {
        loseAcknowledgement = false;
        throw new Error("Synthetic acknowledgement lost after commit");
      }
    },
  };
  const run = execution(faulted, (metric) => metrics.push(metric));
  const invoke = (call: Call) =>
    run({ ...call, correlationId: `local_fault_${++invocationCount}` });
  assert.equal((await invoke(create("REQ-0760"))).statusCode, 201);
  const before = await base.get("REQ-0760");
  available = false;
  const readFailures: number[] = [],
    writeFailures: number[] = [];
  for (let i = 0; i < 10; i++) {
    readFailures.push(
      (
        await invoke({
          method: "GET",
          path: "/requests/REQ-0760",
          actor: requester,
        })
      ).statusCode,
    );
    writeFailures.push((await invoke(create("REQ-0761"))).statusCode);
  }
  assert(
    readFailures.every((s) => s === 503) &&
      writeFailures.every((s) => s === 503),
  );
  assert.deepEqual(await base.get("REQ-0760"), before);
  assert.equal(await base.get("REQ-0761"), null);
  assert.equal(
    (await invoke({ method: "GET", path: "/healthz", actor: requester }))
      .statusCode,
    200,
  );
  observations.push({
    scenario: "dependency unavailable across ten read/write attempts each",
    statuses: [...readFailures, ...writeFailures],
    assertion:
      "20 bounded 503s; existing state unchanged; absent request not created; liveness still 200 is not readiness",
  });
  available = true;
  const recovery = [
    (await invoke(create("REQ-0761"))).statusCode,
    (await invoke(create("REQ-0761"))).statusCode,
  ];
  assert.deepEqual(recovery, [201, 201]);
  assert.equal((await base.get("REQ-0761"))?.events.length, 1);
  observations.push({
    scenario: "unchanged create retry after dependency recovery",
    statuses: recovery,
    assertion: "one request and one event after recovery/replay",
  });
  loseAcknowledgement = true;
  const uncertain = [
    (await invoke(decision("REQ-0760", "uncertain_decision"))).statusCode,
    (await invoke(decision("REQ-0760", "uncertain_decision"))).statusCode,
  ];
  assert.deepEqual(uncertain, [503, 200]);
  assert.equal((await base.get("REQ-0760"))?.request.version, 2);
  assert.equal((await base.get("REQ-0760"))?.events.length, 2);
  observations.push({
    scenario: "commit then injected lost acknowledgement",
    statuses: uncertain,
    assertion:
      "uncertain 503 reconciled by same-key retry; version 2 and two events",
  });
  assert.equal((await invoke(create("REQ-0762"))).statusCode, 201);
  const conflicting = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      invoke(
        decision(
          "REQ-0762",
          `competing_decision_${i}`,
          i % 2 ? "APPROVED" : "REJECTED",
        ),
      ),
    ),
  );
  const codes = conflicting.map((r) => r.statusCode);
  assert.equal(codes.filter((c) => c === 200).length, 1);
  assert(codes.every((c) => [200, 409, 503].includes(c)));
  assert.equal((await base.get("REQ-0762"))?.request.version, 2);
  assert.equal((await base.get("REQ-0762"))?.events.length, 2);
  observations.push({
    scenario: "16 conflicting decisions against one ID",
    statuses: codes,
    assertion:
      "exactly one success, one version increment and one decision audit; transaction contention may return retryable 503",
  });
  assert.equal((await invoke(create("REQ-0763"))).statusCode, 201);
  const sameCall = decision("REQ-0763", "shared_replay_key");
  const sameKey = (
    await Promise.all(Array.from({ length: 16 }, () => invoke(sameCall)))
  ).map((r) => r.statusCode);
  assert(sameKey.every((s) => [200, 409, 503].includes(s)));
  const reconciled: number[] = [];
  for (let i = 0; i < 16; i++)
    reconciled.push((await invoke(sameCall)).statusCode);
  assert(reconciled.every((s) => s === 200));
  assert.equal((await base.get("REQ-0763"))?.request.version, 2);
  assert.equal((await base.get("REQ-0763"))?.events.length, 2);
  observations.push({
    scenario:
      "16 simultaneous same-key decisions then 16 unchanged reconciliation retries",
    statuses: [...sameKey, ...reconciled],
    assertion:
      "all reconciliation retries return the original result; one version increment/decision event",
  });
  assert.equal(metrics.length, invocationCount);
  assert.equal(
    new Set(metrics.map((m) => m.correlationId)).size,
    invocationCount,
  );
} catch (error) {
  failure = error;
} finally {
  try {
    if (client && table && tableCreated)
      await client.send(new DeleteTableCommand({ TableName: table }));
    cleanupPassed = true;
  } catch (error) {
    failure ??= error;
  }
  client?.destroy();
}
const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
const evidence = {
  startedAtUTC,
  passed: failure === undefined && cleanupPassed,
  completedAtUTC: new Date().toISOString(),
  mode,
  boundary:
    "Actual local service calls; no HTTP/platform IAM or cloud calls; injected failures wrap memory or real DynamoDB Local persistence",
  serviceInvocations: metrics.length,
  observations,
  metrics,
  durationSampleMs: {
    count: durations.length,
    min: durations[0],
    p50: durations[Math.ceil(durations.length * 0.5) - 1],
    p95: durations[Math.ceil(durations.length * 0.95) - 1],
    max: durations.at(-1),
  },
  cleanupPassed,
  cloudCalls: false,
  alertsDelivered: false,
  acceptedProductionLoadOrSloClaimed: false,
  limitations: [
    "Failure injection is at the repository boundary, not a measured real AWS outage or SDK backoff test.",
    "Sixteen-way races and twenty failed operations are a bounded local exercise, not a sustained production benchmark.",
    "Durations are end-to-end local service-call samples under this machine/emulator load, not latency targets or cloud performance.",
  ],
};
await mkdir("docs/evidence", { recursive: true });
const output = `docs/evidence/aws-readiness-2-resilience-${mode}${failure ? `-failure-${Date.now()}` : ""}.json`;
await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
if (failure) {
  console.error(`FAIL: ${mode}; evidence preserved at ${output}`);
  throw failure;
}
console.log(
  `PASS: ${mode}, ${metrics.length} service invocations, ${observations.length} fault/concurrency scenarios; cleaned local test state. Evidence: ${output}`,
);
