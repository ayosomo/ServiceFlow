import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Static views of saved actual evidence, never simulated provider consoles.
const directory = "docs/evidence/screenshots";
await mkdir(directory, { recursive: true });
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const block = (title: string, value: unknown) =>
  `<section><h2>${escape(title)}</h2><pre>${escape(JSON.stringify(value, null, 2))}</pre></section>`;
const read = async (file: string) => {
  const bytes = await readFile(file);
  return {
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    text: bytes.toString("utf8"),
  };
};
const http = await read("docs/evidence/phase4-http-responses.txt");
const azure = await read("docs/evidence/azure-package-host.json");
const gcp = await read("docs/evidence/gcp-cloud-verification.json");
const a = JSON.parse(azure.text);
const g = JSON.parse(gcp.text);
const calls = http.text
  .split("\n")
  .filter((line) => line.startsWith("{"))
  .map((line) => {
    const r = JSON.parse(line);
    return {
      method: r.method,
      path: r.path,
      status: r.status,
      ...(r.body.error ? { error: r.body.error } : {}),
      ...(r.body.request
        ? { version: r.body.request.version, auditEvents: r.body.events.length }
        : {}),
    };
  });
const views = [
  {
    name: "aws-local-evidence",
    title: "AWS — local HTTP evidence",
    boundary:
      "Actual loopback execution; in-memory persistence. New controls NOT cloud verified.",
    sources: [http],
    content:
      block("Recorded run", http.text.split("\n")[0]) +
      block(
        "Observed HTTP responses (selected fields)",
        calls.filter(
          (c) =>
            c.path === "/requests" || c.path.startsWith("/requests/REQ-0900"),
        ),
      ),
  },
  {
    name: "azure-local-evidence",
    title: "Azure — local Functions host evidence",
    boundary:
      "Actual saved Functions v4 + Azurite result. Azure cloud NOT VERIFIED.",
    sources: [azure],
    content:
      block("Recorded host/package run", {
        timestamp: a.timestamp,
        kind: a.kind,
        batchId: a.batchId,
        packageSHA256: a.localPackage.sha256,
        packageBytes: a.localPackage.bytes,
        packageFiles: a.localPackage.entryCount,
      }) +
      block("Actual report metrics", {
        totalRecords: a.report.metrics.totalRecords,
        findings: a.report.findings.length,
        quality: a.report.metrics.qualityPassRate,
        readiness: a.report.metrics.readinessRate,
        overdue: a.report.metrics.overdue.count,
      }),
  },
  {
    name: "gcp-cloud-evidence",
    title: "GCP — saved cloud business results",
    boundary:
      "Historical approved run; active resources removed. Deployed health failed; correction local-only.",
    sources: [gcp],
    content:
      block("Exact historical run", {
        deployedAtUTC: g.deployedAtUTC,
        sourceCommit: g.deployedSourceCommit,
        region: g.region,
        revision: g.revision,
        elapsedMinutes: g.elapsedMinutesToProjectDeletionRequest,
        snapshotUnchanged: g.snapshotUnchangedAfterTests,
      }) +
      block("Observed results and exception", {
        totalRecords: g.kpis.totalRecords,
        quality: `${g.kpis.qualityPassRate.numerator}/${g.kpis.qualityPassRate.denominator}`,
        readiness: `${g.kpis.readinessRate.numerator}/${g.kpis.readinessRate.denominator}`,
        overdue: g.kpis.overdue.count,
        healthRoute: g.healthRoute,
        cleanup: g.cleanup.independentAbsenceChecks,
        projectState: g.cleanup.projectState,
      }),
  },
];
for (const view of views) {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escape(view.title)}</title><style>body{margin:0;background:#f1f5f9;color:#142338;font:17px system-ui,sans-serif}main{max-width:1240px;margin:30px auto;padding:32px;background:white;border-top:7px solid #146c78}h1{font-size:34px;margin:10px 0 20px}h2{font-size:18px;margin:0 0 10px}header{color:#146c78;font-weight:700;letter-spacing:2px;font-size:13px}.boundary{background:#fff3d6;padding:15px;border-left:4px solid #ad7100;line-height:1.5}section{border:1px solid #dbe3ec;padding:18px;margin:16px 0}pre{font:15px/1.43 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}footer{font:12px/1.5 Consolas,monospace;color:#45556b;overflow-wrap:anywhere}.note{font-size:14px;line-height:1.5}</style><main><header>SERVICEFLOW CLOUD LABS · EVIDENCE REVIEW</header><h1>${escape(view.title)}</h1><p class="boundary">${escape(view.boundary)}</p><p class="note">All demonstration data is synthetic. Portfolio project, not an employer integration.<br>This browser view displays saved actual records. It is not a live provider console or a new cloud test.</p>${view.content}<footer>${view.sources.map((s) => `${escape(s.file)}<br>SHA-256 ${s.sha256}`).join("<br>")}</footer></main></html>`;
  await writeFile(`${directory}/${view.name}.html`, html);
}
await writeFile(
  `${directory}/sources.json`,
  JSON.stringify(
    {
      generatedAtUTC: new Date().toISOString(),
      kind: "Static browser views of saved actual evidence; not live provider consoles",
      views: views.map((v) => ({
        name: v.name,
        title: v.title,
        boundary: v.boundary,
        sources: v.sources.map(({ file, sha256 }) => ({ file, sha256 })),
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Generated three static evidence views from actual saved HTTP/host/provider records; no cloud calls.",
);
