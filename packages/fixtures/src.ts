import {
  type ServiceRequest,
  type Raw,
  type SupplierUpdate,
} from "../domain/src/index.js";
export const SEED = 2301026;
export function fixtures() {
  let seed = SEED;
  const next = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const base: ServiceRequest[] = Array.from({ length: 48 }, (_, i) => {
    const status = (
      [
        "SUBMITTED",
        "APPROVED",
        "IN_PROGRESS",
        "DONE",
        "REJECTED",
        "DRAFT",
      ] as const
    )[i % 6]!;
    const targetAt = new Date(
      Date.UTC(2026, 9, 15 + Math.floor(next() * 17)),
    ).toISOString();
    return {
      requestId: `REQ-${String(i + 1).padStart(4, "0")}`,
      customerId: `SYN-${String(i + 1).padStart(3, "0")}`,
      summary: `Synthetic service upgrade ${i + 1}`,
      ownerTeam: ["Operations", "Delivery", "Networks"][i % 3]!,
      priority: (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const)[i % 4]!,
      status,
      submittedAt: "2026-10-01T00:00:00.000Z",
      targetAt,
      actualCompletedAt:
        status === "DONE"
          ? new Date(
              Date.parse(targetAt) + (i % 2 ? 86400000 : -86400000),
            ).toISOString()
          : null,
      approvalRequired: true,
      approverId: ["APPROVED", "IN_PROGRESS", "DONE", "REJECTED"].includes(
        status,
      )
        ? "synthetic-approver"
        : null,
      version: 1,
    };
  });
  const crm: Raw[] = structuredClone(base);
  // Eight affected CRM positions: duplicate pair (1,2), missing owner, invalid status,
  // invalid date, impossible chronology, mismatched supplier target, missing ID.
  crm[1]!.requestId = crm[0]!.requestId;
  crm[2]!.ownerTeam = "";
  crm[3]!.status = "DELIVERED_MAYBE";
  crm[4]!.targetAt = "not-a-date";
  crm[5]!.targetAt = "2026-09-01T00:00:00.000Z";
  crm[7]!.requestId = "";
  const supplier: SupplierUpdate[] = base.map((r) => ({
    requestId: r.requestId,
    supplierUpdatedAt: "2026-10-22T12:00:00.000Z",
    supplierMilestone: r.status,
    supplierTargetAt: r.targetAt,
  }));
  supplier[6]!.supplierTargetAt = "2026-11-15T00:00:00.000Z";
  return { base, crm, supplier, affectedCrmRows: [1, 2, 3, 4, 5, 6, 7, 8] };
}
