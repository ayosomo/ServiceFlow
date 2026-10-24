import { it, expect } from "vitest";
import { fixtures } from "../../../packages/fixtures/src.js";
import {
  reconcile,
  kpis,
  SNAPSHOT,
} from "../../../packages/domain/src/index.js";
import { createApp, identityAuth } from "../src/app.js";
import { FixtureRepository } from "../src/repository.js";
const f = fixtures();
const repository = () =>
  new FixtureRepository({
    requests: f.crm,
    findings: reconcile(f.crm, f.supplier),
    sourceHash: "synthetic-test-hash",
  });
it("BA-004 serves deterministic KPIs and supports bounded drill-down", async () => {
  const app = createApp(repository(), async () => "synthetic-manager");
  try {
    const r = await app.inject("/kpis?asOf=2026-10-23");
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject(
      kpis(f.crm, reconcile(f.crm, f.supplier), SNAPSHOT),
    );
    const findings = await app.inject("/findings?severity=CRITICAL&limit=2");
    expect(findings.json().total).toBe(8);
    expect(findings.json().items).toHaveLength(2);
    const dirty = await app.inject("/requests/REQ-0001/insight");
    expect(dirty.json()).toMatchObject({
      qualityStatus: "FAIL",
      readinessStatus: "UNASSESSABLE",
    });
    const pending = await app.inject("/requests/REQ-0013/insight");
    expect(pending.json()).toMatchObject({
      qualityStatus: "PASS",
      readinessStatus: "BLOCKED",
    });
    expect((await app.inject("/kpis?asOf=invalid")).statusCode).toBe(400);
    expect((await app.inject("/findings?limit=1000")).statusCode).toBe(400);
  } finally {
    await app.close();
  }
});
it("denies anonymous, fake and expired tokens", async () => {
  const app = createApp(
    repository(),
    identityAuth("https://example.invalid", ["synthetic@example.invalid"]),
  );
  try {
    for (const authorization of [
      undefined,
      "Bearer expired.token.signature",
      "Bearer forged",
    ])
      expect(
        (
          await app.inject({
            url: "/kpis",
            headers: authorization ? { authorization } : {},
          })
        ).statusCode,
      ).toBe(403);
  } finally {
    await app.close();
  }
});
it("BA-006 returns null for zero denominators and rejects missing dates", async () => {
  const app = createApp(
    new FixtureRepository({ requests: [], findings: [], sourceHash: "empty" }),
    async () => "synthetic",
  );
  try {
    expect(
      (await app.inject("/kpis")).json().onTimeCompletion.value,
    ).toBeNull();
  } finally {
    await app.close();
  }
  expect(
    kpis([{ ...f.base[0], targetAt: undefined }], []).overdue.denominator,
  ).toBe(0);
});
it("redacts provider errors and does not fabricate zero metrics", async () => {
  const app = createApp(
    {
      load: async () => {
        throw new Error("private provider failure");
      },
    },
    async () => "synthetic",
  );
  try {
    const r = await app.inject("/kpis");
    expect(r.statusCode).toBe(503);
    expect(r.body).not.toContain("private provider");
  } finally {
    await app.close();
  }
});
