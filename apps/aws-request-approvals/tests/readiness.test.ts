import { expect, it } from "vitest";
import { api, MemoryRepository, type Call } from "../src/service.js";

const requester = {
  id: "synthetic-requester",
  roles: ["requester", "approver"],
} satisfies NonNullable<Call["actor"]>;
const approver = {
  id: "synthetic-approver",
  roles: ["approver"],
} satisfies NonNullable<Call["actor"]>;
const create: Call = {
  method: "POST",
  path: "/requests",
  actor: requester,
  idempotencyKey: "readiness_create",
  body: JSON.stringify({
    requestId: "REQ-0800",
    customerId: "SYN-800",
    summary: "Synthetic readiness check",
    ownerTeam: "Operations",
    priority: "HIGH",
    submittedAt: "2026-10-01T00:00:00.000Z",
    targetAt: "2026-10-30T00:00:00.000Z",
    approvalRequired: true,
  }),
};
const decide: Call = {
  method: "POST",
  path: "/requests/REQ-0800/decision",
  actor: approver,
  idempotencyKey: "readiness_decision",
  body: JSON.stringify({
    decision: "APPROVED",
    reason: "Independent review",
    version: 1,
  }),
};

it.each(["APPROVED", "REJECTED"])(
  "BA-007 denies the submitting principal's own %s decision, including dual-role identities",
  async (decision) => {
    const repo = new MemoryRepository(),
      run = api(repo);
    expect((await run(create)).statusCode).toBe(201);
    const before = await repo.get("REQ-0800");
    expect(
      (
        await run({
          ...decide,
          actor: requester,
          body: JSON.stringify({
            decision,
            reason: "Self decision forbidden",
            version: 1,
          }),
        })
      ).statusCode,
    ).toBe(403);
    expect(await repo.get("REQ-0800")).toEqual(before);
    expect(repo.receipts.size).toBe(1);
    expect((await run(decide)).statusCode).toBe(200);
  },
);

it.each(["missing", "duplicate", "wrong-request", "empty-actor"])(
  "BA-007 fails closed on %s submission provenance without writing a receipt",
  async (fault) => {
    const repo = new MemoryRepository(),
      run = api(repo);
    await run(create);
    const stored = repo.records.get("REQ-0800")!;
    if (fault === "missing") stored.events = [];
    if (fault === "duplicate")
      stored.events.push(structuredClone(stored.events[0]!));
    if (fault === "wrong-request") stored.events[0]!.requestId = "REQ-0001";
    if (fault === "empty-actor") stored.events[0]!.actorId = " ";
    const before = await repo.get("REQ-0800");
    expect(await run(decide)).toEqual({
      statusCode: 503,
      body: { error: "Submission audit unavailable" },
    });
    expect(await repo.get("REQ-0800")).toEqual(before);
    expect(repo.receipts.size).toBe(1);
  },
);

it("BA-008 recovers a create and decision after commit succeeded but its acknowledgement was lost", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  const save = repo.save.bind(repo);
  repo.save = async (...args) => {
    await save(...args);
    throw new Error(
      "Synthetic lost provider acknowledgement; do not expose this detail",
    );
  };
  expect(await run(create)).toEqual({
    statusCode: 503,
    body: { error: "Persistence unavailable" },
  });
  expect((await repo.get("REQ-0800"))?.request.version).toBe(1);
  expect((await run(create)).statusCode).toBe(201);
  expect((await run(decide)).statusCode).toBe(503);
  expect((await repo.get("REQ-0800"))?.request).toMatchObject({
    version: 2,
    status: "APPROVED",
  });
  expect((await run(decide)).statusCode).toBe(200);
  expect((await repo.get("REQ-0800"))?.events).toHaveLength(2);
  expect(repo.receipts.size).toBe(2);
  const before = await repo.get("REQ-0800");
  expect(
    (
      await run({
        ...decide,
        body: JSON.stringify({
          decision: "REJECTED",
          reason: "Changed retry body",
          version: 1,
        }),
      })
    ).statusCode,
  ).toBe(409);
  expect(await repo.get("REQ-0800")).toEqual(before);
  // A previously accepted receipt cannot bypass the current provenance policy.
  const stored = repo.records.get("REQ-0800")!;
  stored.events.find(
    (event) => event.eventType === "REQUEST_SUBMITTED",
  )!.actorId = approver.id;
  expect((await run(decide)).statusCode).toBe(403);
  stored.events = stored.events.filter(
    (event) => event.eventType !== "REQUEST_SUBMITTED",
  );
  expect((await run(decide)).statusCode).toBe(503);
  expect(repo.receipts.size).toBe(2);
});

it("BA-008 exposes a bounded 503 and leaves state unchanged when decision reads fail", async () => {
  const repo = new MemoryRepository(),
    run = api(repo);
  await run(create);
  const before = structuredClone(repo.records);
  repo.get = async () => {
    throw new Error("Synthetic private provider detail");
  };
  expect(await run(decide)).toEqual({
    statusCode: 503,
    body: { error: "Persistence unavailable" },
  });
  expect(repo.records).toEqual(before);
  expect(repo.receipts.size).toBe(1);
});
