import Fastify from "fastify";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import {
  iso,
  kpis,
  assess,
  requestSchema,
  requestIdSchema,
  SNAPSHOT,
} from "../../../packages/domain/src/index.js";
import { type InsightsRepository } from "./repository.js";
export type Authenticate = (
  authorization: string | undefined,
) => Promise<string | null>;
export function identityAuth(audience: string, emails: string[]): Authenticate {
  const client = new OAuth2Client();
  return async (authorization) => {
    if (!authorization?.startsWith("Bearer ")) return null;
    try {
      const ticket = await client.verifyIdToken({
        idToken: authorization.slice(7),
        audience,
      });
      const p = ticket.getPayload();
      return p?.email_verified && p.email && emails.includes(p.email)
        ? p.email
        : null;
    } catch {
      return null;
    }
  };
}
export function createApp(
  repo: InsightsRepository,
  authenticate: Authenticate,
) {
  const app = Fastify({
    bodyLimit: 16384,
    logger: false,
    requestTimeout: 10000,
  });
  app.addHook("onRequest", async (req, reply) => {
    if (!(await authenticate(req.headers.authorization)))
      return reply.code(403).send({ error: "Forbidden" });
  });
  app.setErrorHandler((error, req, reply) => {
    const invalid = error instanceof z.ZodError;
    req.log.error(
      { correlationId: req.id, statusCode: invalid ? 400 : 503 },
      "Request failed",
    );
    return reply.code(invalid ? 400 : 503).send({
      error: invalid ? "Invalid query" : "Data unavailable",
      correlationId: req.id,
    });
  });
  app.addHook("onSend", async (_req, reply) => {
    reply.header("cache-control", "no-store");
  });
  app.addHook("onResponse", async (req, reply) => {
    console.log(
      JSON.stringify({
        correlationId: req.id,
        statusCode: reply.statusCode,
        event: "request_complete",
      }),
    );
  });
  // Cloud Run reserves some paths ending in z before they reach the container.
  app.get("/health", () => ({ status: "ok" }));
  const asOf = (query: unknown) => {
    const p = z.object({ asOf: z.string().optional() }).strict().parse(query);
    const v = p.asOf ?? SNAPSHOT;
    return iso.parse(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00.000Z` : v);
  };
  app.get("/kpis", async (req) => {
    const date = asOf(req.query),
      s = await repo.load();
    return { ...kpis(s.requests, s.findings, date), sourceHash: s.sourceHash };
  });
  app.get("/findings", async (req) => {
    const q = z
      .object({
        severity: z.enum(["CRITICAL", "REVIEW"]).optional(),
        status: z.literal("OPEN").optional(),
        offset: z.coerce.number().int().min(0).max(1000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .strict()
      .parse(req.query);
    const s = await repo.load(),
      rows = s.findings.filter(
        (f) =>
          (!q.severity || f.severity === q.severity) &&
          (!q.status || f.status === q.status),
      );
    return {
      total: rows.length,
      offset: q.offset,
      limit: q.limit,
      items: rows.slice(q.offset, q.offset + q.limit),
      sourceHash: s.sourceHash,
    };
  });
  app.get("/requests/:id/insight", async (req, reply) => {
    const id = requestIdSchema.parse((req.params as { id: string }).id);
    const date = asOf(req.query),
      s = await repo.load(),
      rows = s.requests.filter((r) => r.requestId === id);
    if (!rows.length) return reply.code(404).send({ error: "Not found" });
    const findings = s.findings.filter((f) => f.requestId === id),
      parsed = requestSchema.safeParse(rows[0]);
    const invalid =
      rows.length !== 1 ||
      !parsed.success ||
      findings.some((f) => f.severity === "CRITICAL");
    if (invalid)
      return {
        requestId: id,
        asOf: date,
        qualityStatus: "FAIL",
        readinessStatus: "UNASSESSABLE",
        performanceStatus: "UNASSESSABLE",
        findings,
        actions: [
          {
            ruleId: "DATA_INTEGRITY",
            action:
              "Data Steward to resolve critical findings before delivery assessment",
          },
        ],
      };
    const r = parsed.data!,
      assessment = assess(r, date);
    return {
      requestId: id,
      asOf: date,
      ...assessment,
      findings,
      actions: [
        ...(assessment.readinessStatus === "BLOCKED"
          ? [
              {
                ruleId: "PENDING_APPROVAL",
                action: "Approver to record a decision",
              },
            ]
          : []),
        ...(assessment.performanceStatus === "OVERDUE"
          ? [
              {
                ruleId: "OVERDUE_TARGET",
                action: `${r.ownerTeam} to review target and delivery plan`,
              },
            ]
          : []),
      ],
      sourceHash: s.sourceHash,
    };
  });
  return app;
}
