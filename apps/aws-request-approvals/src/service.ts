import { createHash, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  requestSchema,
  iso,
  priority,
  canTransition,
  type ServiceRequest,
  type AuditEvent,
} from "../../../packages/domain/src/index.js";
export class Conflict extends Error {}
export interface Receipt {
  fingerprint: string;
  request: ServiceRequest;
}
export interface Repository {
  get(
    id: string,
  ): Promise<{ request: ServiceRequest; events: AuditEvent[] } | null>;
  receipt(key: string): Promise<Receipt | null>;
  save(
    request: ServiceRequest,
    event: AuditEvent,
    key: string,
    receipt: Receipt,
    expectedVersion?: number,
  ): Promise<void>;
}
export class MemoryRepository implements Repository {
  records = new Map<
    string,
    { request: ServiceRequest; events: AuditEvent[] }
  >();
  receipts = new Map<string, Receipt>();
  async get(id: string) {
    return structuredClone(this.records.get(id) ?? null);
  }
  async receipt(key: string) {
    return structuredClone(this.receipts.get(key) ?? null);
  }
  async save(
    request: ServiceRequest,
    event: AuditEvent,
    key: string,
    receipt: Receipt,
    version?: number,
  ) {
    const existing = this.records.get(request.requestId);
    if (
      this.receipts.has(key) ||
      (version === undefined
        ? !!existing
        : existing?.request.version !== version)
    )
      throw new Conflict();
    this.records.set(
      request.requestId,
      structuredClone({
        request,
        events: [event, ...(existing?.events ?? [])].slice(0, 50),
      }),
    );
    this.receipts.set(key, structuredClone(receipt));
  }
}
const create = z
  .object({
    requestId: z
      .string()
      .regex(/^REQ-\d{4}$/)
      .optional(),
    customerId: z.string().regex(/^SYN-\d{3}$/),
    summary: z.string().trim().min(5).max(200),
    ownerTeam: z.string().trim().min(1).max(60),
    priority,
    submittedAt: iso,
    targetAt: iso,
    approvalRequired: z.boolean(),
  })
  .strict();
const decision = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(5).max(500),
    version: z.number().int().positive(),
  })
  .strict();
export interface Call {
  method: string;
  path: string;
  body?: string;
  idempotencyKey?: string;
  actor?: { id: string; roles: ("requester" | "approver" | "reader")[] };
  correlationId?: string;
}
export function api(repo: Repository, clock = () => new Date().toISOString()) {
  return async (call: Call): Promise<{ statusCode: number; body: unknown }> => {
    const respond = (statusCode: number, body: unknown) => ({
      statusCode,
      body,
    });
    if (!call.actor) return respond(403, { error: "Forbidden" });
    const actor = call.actor;
    const match = /^\/requests\/(REQ-\d{4})(\/decision)?$/.exec(call.path);
    if (call.method === "GET") {
      if (
        !actor.roles.some((r) =>
          ["reader", "requester", "approver"].includes(r),
        )
      )
        return respond(403, { error: "Forbidden" });
      if (call.path === "/healthz") return respond(200, { status: "ok" });
      if (!match || match[2]) return respond(404, { error: "Not found" });
      try {
        const result = await repo.get(match[1]!);
        return respond(result ? 200 : 404, result ?? { error: "Not found" });
      } catch {
        return respond(503, { error: "Persistence unavailable" });
      }
    }
    const creating = call.method === "POST" && call.path === "/requests";
    const deciding = call.method === "POST" && !!match?.[2];
    if (!creating && !deciding) return respond(404, { error: "Not found" });
    if (!actor.roles.includes(creating ? "requester" : "approver"))
      return respond(403, { error: "Forbidden" });
    if (!call.body || Buffer.byteLength(call.body) > 16384)
      return respond(400, { error: "Body missing or exceeds 16 KiB" });
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(call.idempotencyKey ?? ""))
      return respond(400, {
        error: "Idempotency-Key required (8–100 safe characters)",
      });
    try {
      const input: unknown = JSON.parse(call.body);
      const parsed = creating ? create.parse(input) : decision.parse(input);
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(parsed))
        .digest("hex");
      const key = createHash("sha256")
        .update(`${actor.id}|${call.path}|${call.idempotencyKey}`)
        .digest("hex");
      const replay = await repo.receipt(key);
      if (replay)
        return respond(
          replay.fingerprint === fingerprint ? (creating ? 201 : 200) : 409,
          replay.fingerprint === fingerprint
            ? replay.request
            : { error: "Idempotency conflict" },
        );
      let request: ServiceRequest, expectedVersion: number | undefined;
      if (creating) {
        const r = create.parse(input);
        request = requestSchema.parse({
          ...r,
          requestId:
            r.requestId ??
            `REQ-${String(randomInt(1, 10000)).padStart(4, "0")}`,
          status: "SUBMITTED",
          approverId: null,
          version: 1,
        });
      } else {
        const d = decision.parse(input),
          existing = await repo.get(match![1]!);
        if (!existing) return respond(404, { error: "Not found" });
        if (
          existing.request.version !== d.version ||
          !canTransition(existing.request.status, d.decision)
        )
          return respond(409, { error: "Version or transition conflict" });
        expectedVersion = d.version;
        request = requestSchema.parse({
          ...existing.request,
          status: d.decision,
          approverId: actor.id,
          version: d.version + 1,
        });
      }
      const event: AuditEvent = {
        eventId: randomUUID(),
        requestId: request.requestId,
        eventType: creating ? "REQUEST_SUBMITTED" : "DECISION_RECORDED",
        actorId: actor.id,
        occurredAt: clock(),
        correlationId: call.correlationId ?? randomUUID(),
        details: creating
          ? {}
          : { decision: request.status, reason: decision.parse(input).reason },
      };
      try {
        await repo.save(
          request,
          event,
          key,
          { fingerprint, request },
          expectedVersion,
        );
      } catch (error) {
        if (!(error instanceof Conflict)) throw error;
        const receipt = await repo.receipt(key);
        if (receipt?.fingerprint === fingerprint)
          return respond(creating ? 201 : 200, receipt.request);
        return respond(409, { error: "Concurrent write or duplicate ID" });
      }
      return respond(creating ? 201 : 200, request);
    } catch (error) {
      if (error instanceof z.ZodError)
        return respond(400, {
          error: "Validation failed",
          fields: error.issues
            .slice(0, 8)
            .map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      if (error instanceof SyntaxError)
        return respond(400, { error: "Malformed JSON" });
      return respond(503, { error: "Persistence unavailable" });
    }
  };
}
