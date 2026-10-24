import { z } from "zod";

export const SNAPSHOT = "2026-10-23T00:00:00.000Z";
export const iso = z.string().datetime({ offset: false });
export const status = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "DONE",
]);
export const priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const UUID_REQUEST_ID_FRAGMENT =
  "REQ-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const REQUEST_ID_FRAGMENT = `(?:REQ-[0-9]{4}|${UUID_REQUEST_ID_FRAGMENT})`;
export const requestIdSchema = z
  .string()
  .regex(new RegExp(`^${REQUEST_ID_FRAGMENT}$`));
export const generatedRequestIdSchema = z
  .string()
  .regex(new RegExp(`^${UUID_REQUEST_ID_FRAGMENT}$`));
export const requestPathPattern = new RegExp(
  `^/requests/(${REQUEST_ID_FRAGMENT})(/decision)?$`,
);
export const requestSchema = z
  .object({
    requestId: requestIdSchema,
    customerId: z.string().regex(/^SYN-\d{3}$/),
    summary: z.string().trim().min(5).max(200),
    ownerTeam: z.string().trim().min(1).max(60),
    priority,
    status,
    submittedAt: iso,
    targetAt: iso,
    actualCompletedAt: iso.nullable().optional(),
    approvalRequired: z.boolean(),
    approverId: z.string().min(1).max(100).nullable().optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (
      Date.parse(r.targetAt) < Date.parse(r.submittedAt) ||
      (r.actualCompletedAt &&
        Date.parse(r.actualCompletedAt) < Date.parse(r.submittedAt))
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetAt"],
        message: "Impossible chronology",
      });
    if (r.status === "DONE" && !r.actualCompletedAt)
      ctx.addIssue({
        code: "custom",
        path: ["actualCompletedAt"],
        message: "Completion date required",
      });
    if (
      r.approvalRequired &&
      ["APPROVED", "IN_PROGRESS", "DONE"].includes(r.status) &&
      !r.approverId
    )
      ctx.addIssue({
        code: "custom",
        path: ["approverId"],
        message: "Decision principal required",
      });
  });
export type ServiceRequest = z.infer<typeof requestSchema>;
export interface AuditEvent {
  eventId: string;
  requestId: string;
  eventType: string;
  actorId: string;
  occurredAt: string;
  correlationId: string;
  details: Record<string, unknown>;
}
export type Raw = Record<string, unknown>;
export interface SupplierUpdate extends Record<string, unknown> {
  requestId: string;
  supplierUpdatedAt: string;
  supplierMilestone: string;
  supplierTargetAt: string;
}
export interface Finding {
  ruleId: string;
  source: "CRM" | "SUPPLIER";
  row: number;
  requestId: string | null;
  severity: "CRITICAL" | "REVIEW";
  owner: string;
  values: Record<string, unknown>;
  status: "OPEN";
}
export function reconcile(crm: Raw[], supplier: Raw[]): Finding[] {
  const findings: Finding[] = [];
  const add = (
    ruleId: string,
    source: Finding["source"],
    row: number,
    record: Raw,
    severity: Finding["severity"],
    values: Record<string, unknown>,
  ) =>
    findings.push({
      ruleId,
      source,
      row: row + 1,
      requestId:
        typeof record.requestId === "string" && record.requestId
          ? record.requestId
          : null,
      severity,
      owner:
        typeof record.ownerTeam === "string" && record.ownerTeam
          ? record.ownerTeam
          : "Data Steward",
      values,
      status: "OPEN",
    });
  const ids = new Set(crm.map((r) => r.requestId));
  for (const [source, rows] of [
    ["CRM", crm],
    ["SUPPLIER", supplier],
  ] as const) {
    const counts = new Map<unknown, number>();
    rows.forEach((r) =>
      counts.set(r.requestId, (counts.get(r.requestId) ?? 0) + 1),
    );
    rows.forEach((r, i) => {
      if (!r.requestId)
        add("MISSING_ID", source, i, r, "CRITICAL", {
          requestId: r.requestId ?? null,
        });
      if (r.requestId && counts.get(r.requestId)! > 1)
        add("DUPLICATE_ID", source, i, r, "CRITICAL", {
          requestId: r.requestId,
        });
      if (source === "CRM") {
        const parsed = requestSchema.safeParse(r);
        if (!parsed.success)
          for (const e of parsed.error.issues)
            add(
              `INVALID_${String(e.path[0] ?? "RECORD").toUpperCase()}`,
              source,
              i,
              r,
              "CRITICAL",
              {
                field: e.path.join("."),
                value: r[String(e.path[0])] ?? null,
                message: e.message,
              },
            );
      } else {
        for (const f of ["supplierUpdatedAt", "supplierTargetAt"])
          if (!iso.safeParse(r[f]).success)
            add("INVALID_SUPPLIER_DATE", source, i, r, "CRITICAL", {
              field: f,
              value: r[f] ?? null,
            });
        if (!ids.has(r.requestId))
          add("MISSING_MATCH", source, i, r, "REVIEW", {
            requestId: r.requestId,
          });
        const match = crm.find((c) => c.requestId === r.requestId);
        if (
          match &&
          iso.safeParse(match.targetAt).success &&
          iso.safeParse(r.supplierTargetAt).success &&
          Date.parse(String(match.targetAt)) !==
            Date.parse(String(r.supplierTargetAt))
        )
          add("TARGET_MISMATCH", source, i, r, "REVIEW", {
            crm: match.targetAt,
            supplier: r.supplierTargetAt,
            authority: "CRM planned target; steward review required",
          });
      }
    });
  }
  return findings;
}
export function assess(r: ServiceRequest, asOf: string) {
  const active = ["SUBMITTED", "APPROVED", "IN_PROGRESS"].includes(r.status);
  return {
    qualityStatus: "PASS" as const,
    readinessStatus: !active
      ? "NOT_APPLICABLE"
      : r.approvalRequired && !r.approverId
        ? "BLOCKED"
        : "READY",
    performanceStatus:
      active && Date.parse(r.targetAt) < Date.parse(asOf)
        ? "OVERDUE"
        : "ON_TRACK",
    active,
  };
}
export function kpis(raw: Raw[], findings: Finding[], asOf = SNAPSHOT) {
  iso.parse(asOf);
  const criticalIds = new Set(
    findings.filter((f) => f.severity === "CRITICAL").map((f) => f.requestId),
  );
  const counts = new Map<unknown, number>();
  raw.forEach((r) =>
    counts.set(r.requestId, (counts.get(r.requestId) ?? 0) + 1),
  );
  const identifiable = raw.filter(
    (r) => requestIdSchema.safeParse(r.requestId).success,
  );
  const valid = raw.flatMap((r) => {
    const p = requestSchema.safeParse(r);
    return p.success &&
      counts.get(r.requestId) === 1 &&
      !criticalIds.has(p.data.requestId)
      ? [p.data]
      : [];
  });
  const active = valid.filter((r) => assess(r, asOf).active);
  const done = valid.filter((r) => r.status === "DONE");
  const ratio = (
    numerator: number,
    denominator: number,
    excluded: number,
    definition: string,
  ) => ({
    numerator,
    denominator,
    excluded,
    value: denominator ? numerator / denominator : null,
    definition,
  });
  return {
    asOf,
    totalRecords: raw.length,
    unidentifiable: raw.length - identifiable.length,
    qualityPassRate: ratio(
      valid.length,
      identifiable.length,
      raw.length - identifiable.length,
      "No critical integrity findings; identifiable raw rows denominator; duplicate occurrences fail.",
    ),
    readinessRate: ratio(
      active.filter((r) => assess(r, asOf).readinessStatus === "READY").length,
      active.length,
      raw.length - active.length,
      "Ready / assessable active; pending approval blocks readiness only.",
    ),
    overdue: {
      count: active.filter((r) => Date.parse(r.targetAt) < Date.parse(asOf))
        .length,
      denominator: active.length,
      excluded: raw.length - active.length,
      definition: "Active valid records with targetAt strictly before asOf.",
    },
    onTimeCompletion: ratio(
      done.filter(
        (r) => Date.parse(r.actualCompletedAt!) <= Date.parse(r.targetAt),
      ).length,
      done.length,
      raw.length - done.length,
      "DONE with completion <= target / assessable DONE.",
    ),
    exceptionBacklog: {
      count: findings.filter((f) => f.status === "OPEN").length,
      critical: findings.filter((f) => f.severity === "CRITICAL").length,
      review: findings.filter((f) => f.severity === "REVIEW").length,
    },
  };
}
export const transitions: Record<
  ServiceRequest["status"],
  ServiceRequest["status"][]
> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_PROGRESS"],
  REJECTED: [],
  IN_PROGRESS: ["DONE"],
  DONE: [],
};
export function canTransition(
  from: ServiceRequest["status"],
  to: ServiceRequest["status"],
) {
  return transitions[from].includes(to);
}
