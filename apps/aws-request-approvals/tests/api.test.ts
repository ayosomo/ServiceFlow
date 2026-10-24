import { it, expect } from "vitest";
import { api, MemoryRepository, type Call } from "../src/service.js";
import { principal } from "../src/lambda.js";
const payload = {
  requestId: "REQ-0099",
  customerId: "SYN-099",
  summary: "Synthetic installation",
  ownerTeam: "Operations",
  priority: "HIGH",
  submittedAt: "2026-10-01T00:00:00.000Z",
  targetAt: "2026-10-30T00:00:00.000Z",
  approvalRequired: true,
};
const actor: Call["actor"] = {
  id: "synthetic-user",
  roles: ["requester", "approver", "reader"],
};
const create: Call = {
  method: "POST",
  path: "/requests",
  actor,
  body: JSON.stringify(payload),
  idempotencyKey: "create_0099",
};
it("BA-001/002 creates, persists, decides atomically and replays without another audit", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  expect((await run(create)).statusCode).toBe(201);
  const call = {
    method: "POST",
    path: "/requests/REQ-0099/decision",
    actor,
    body: JSON.stringify({
      decision: "APPROVED",
      reason: "Synthetic approved rationale",
      version: 1,
    }),
    idempotencyKey: "decision_0099",
  };
  expect((await run(call)).statusCode).toBe(200);
  expect((await run(call)).statusCode).toBe(200);
  expect(await repo.get("REQ-0099")).toMatchObject({
    request: { status: "APPROVED", version: 2 },
    events: [
      {
        actorId: "synthetic-user",
        details: { reason: "Synthetic approved rationale" },
      },
      {},
    ],
  });
  expect((await repo.get("REQ-0099"))?.events).toHaveLength(2);
  expect(
    (await run({ ...call, idempotencyKey: "stale_0099" })).statusCode,
  ).toBe(409);
  expect(
    (
      await run({
        ...call,
        body: JSON.stringify({
          decision: "REJECTED",
          reason: "Other rationale",
          version: 1,
        }),
      })
    ).statusCode,
  ).toBe(409);
});
it("BA-005 denies anonymous and wrong-role calls without side effects", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  expect((await run({ ...create, actor: undefined })).statusCode).toBe(403);
  expect(
    (await run({ ...create, actor: { id: "reader", roles: ["reader"] } }))
      .statusCode,
  ).toBe(403);
  expect(repo.records.size).toBe(0);
  expect(principal(undefined)).toBeUndefined();
  expect(principal("unlisted-principal")).toBeUndefined();
});
it.each([
  { ...payload, ownerTeam: undefined },
  { ...payload, priority: "URGENT" },
  { ...payload, targetAt: "wrong" },
  { ...payload, targetAt: "2020-01-01T00:00:00.000Z" },
])("rejects malformed create %j", async (body) =>
  expect(
    (
      await api(new MemoryRepository())({
        ...create,
        body: JSON.stringify(body),
      })
    ).statusCode,
  ).toBe(400),
);
it("preserves state on duplicate IDs and concurrent conflicting decisions", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  await run(create);
  expect(
    (await run({ ...create, idempotencyKey: "different_key" })).statusCode,
  ).toBe(409);
  const decisions = await Promise.all(
    ["APPROVED", "REJECTED"].map((decision, i) =>
      run({
        method: "POST",
        path: "/requests/REQ-0099/decision",
        actor,
        body: JSON.stringify({
          decision,
          reason: "Concurrent synthetic test",
          version: 1,
        }),
        idempotencyKey: `race_key_${i}`,
      }),
    ),
  );
  expect(decisions.map((d) => d.statusCode).sort()).toEqual([200, 409]);
  expect((await repo.get("REQ-0099"))?.events).toHaveLength(2);
});
it("reports malformed JSON, oversized input and missing key", async () => {
  const run = api(new MemoryRepository());
  for (const change of [
    { body: "{" },
    { body: "x".repeat(17000) },
    { idempotencyKey: undefined },
  ])
    expect((await run({ ...create, ...change })).statusCode).toBe(400);
});
it("handles provider failure without claiming a write", async () => {
  const repo = new MemoryRepository();
  repo.save = async () => {
    throw new Error("timeout");
  };
  expect((await api(repo)(create)).statusCode).toBe(503);
  expect(repo.records.size).toBe(0);
});
