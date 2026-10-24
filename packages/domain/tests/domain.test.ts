import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fixtures } from "../../fixtures/src.js";
import {
  requestSchema,
  reconcile,
  kpis,
  assess,
  canTransition,
  SNAPSHOT,
} from "../src/index.js";
describe("shared business contract", () => {
  it("reproduces checked-in 48-record snapshots with eight affected source rows", () => {
    const f = fixtures();
    expect(f).toEqual(fixtures());
    expect(f.base).toHaveLength(48);
    expect(f.crm).toEqual(
      JSON.parse(readFileSync("packages/fixtures/data/crm.json", "utf8")),
    );
    f.base.forEach((r) =>
      expect(requestSchema.safeParse(r).success).toBe(true),
    );
    const findings = reconcile(f.crm, f.supplier);
    const crmRows = new Set(
      findings.filter((x) => x.source === "CRM").map((x) => x.row),
    );
    findings
      .filter((x) => x.ruleId === "TARGET_MISMATCH")
      .forEach((x) => crmRows.add(x.row));
    expect([...crmRows].sort((a, b) => a - b)).toEqual(f.affectedCrmRows);
    expect(findings.filter((x) => x.ruleId === "DUPLICATE_ID")).toHaveLength(2);
  });
  it("separates quality, readiness and performance", () => {
    const r = fixtures().base[12]!;
    expect(
      assess({ ...r, targetAt: "2026-10-10T00:00:00.000Z" }, SNAPSHOT),
    ).toMatchObject({
      qualityStatus: "PASS",
      readinessStatus: "BLOCKED",
      performanceStatus: "OVERDUE",
    });
    expect(
      assess({ ...r, targetAt: SNAPSHOT }, SNAPSHOT).performanceStatus,
    ).toBe("ON_TRACK");
  });
  it("handles empty metrics, invalid records and missing IDs explicitly", () => {
    expect(kpis([], []).qualityPassRate.value).toBeNull();
    const f = fixtures(),
      result = kpis(f.crm, reconcile(f.crm, f.supplier));
    expect(result.unidentifiable).toBe(1);
    expect(result.qualityPassRate).toMatchObject({
      numerator: 41,
      denominator: 47,
    });
    expect(result).toEqual(
      JSON.parse(readFileSync("packages/fixtures/data/kpis.json", "utf8")),
    );
  });
  it("allows only specified transitions", () => {
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(true);
    expect(canTransition("DONE", "APPROVED")).toBe(false);
  });
  it("compares timestamp instants regardless of fractional-second formatting", () => {
    const r = { ...fixtures().base[12]!, targetAt: "2026-10-23T00:00:00.100Z" };
    expect(assess(r, "2026-10-23T00:00:00Z").performanceStatus).toBe(
      "ON_TRACK",
    );
    expect(kpis([r], [], "2026-10-23T00:00:00Z").overdue.count).toBe(0);
    const done = {
      ...r,
      status: "DONE",
      approverId: "synthetic",
      actualCompletedAt: "2026-10-23T00:00:00Z",
    };
    expect(kpis([done], []).onTimeCompletion.value).toBe(1);
  });
});
