import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import {
  reconcile,
  kpis,
  SNAPSHOT,
  type Raw,
  type Finding,
} from "../../../packages/domain/src/index.js";
export class Retryable extends Error {}
export class BatchConflict extends Error {}
export interface BlobValue {
  text: string;
  etag: string;
}
export interface Store {
  get(path: string): Promise<BlobValue | null>;
  putOnce(path: string, text: string): Promise<boolean>;
}
export class MemoryStore implements Store {
  blobs = new Map<string, BlobValue>();
  async get(path: string) {
    return structuredClone(this.blobs.get(path) ?? null);
  }
  async putOnce(path: string, text: string) {
    if (this.blobs.has(path)) return false;
    this.blobs.set(path, { text, etag: hash(text) });
    return true;
  }
}
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function csvInput(text: string, source: "CRM" | "SUPPLIER"): Raw[] {
  if (Buffer.byteLength(text) > 1024 * 1024)
    throw new Error("File exceeds 1 MiB");
  const rows = parse(text, {
    bom: true,
    columns: (headers: string[]) => {
      if (new Set(headers).size !== headers.length)
        throw new Error("Duplicate CSV header");
      const required =
        source === "CRM"
          ? [
              "requestId",
              "customerId",
              "summary",
              "ownerTeam",
              "priority",
              "status",
              "submittedAt",
              "targetAt",
              "approvalRequired",
              "version",
            ]
          : [
              "requestId",
              "supplierUpdatedAt",
              "supplierMilestone",
              "supplierTargetAt",
            ];
      if (required.some((h) => !headers.includes(h)))
        throw new Error("Missing required CSV header");
      return headers;
    },
    skip_empty_lines: true,
    max_record_size: 1024 * 1024,
  }) as Record<string, string>[];
  if (rows.length > 200 || rows.length === 0)
    throw new Error("CSV must contain 1–200 rows");
  return rows.map((r) =>
    source === "SUPPLIER"
      ? r
      : {
          ...r,
          approvalRequired:
            r.approvalRequired === "true"
              ? true
              : r.approvalRequired === "false"
                ? false
                : r.approvalRequired,
          version: /^[1-9]\d*$/.test(r.version ?? "")
            ? Number(r.version)
            : r.version,
          actualCompletedAt: r.actualCompletedAt || null,
          approverId: r.approverId || null,
        },
  );
}
export interface Report {
  batchId: string;
  sourceHash: string;
  sourceEtags: Record<string, string>;
  asOf: string;
  findings: Finding[];
  metrics: ReturnType<typeof kpis>;
  ruleVersion: string;
}
export async function processBatch(
  store: Store,
  batchId: string,
): Promise<Report> {
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(batchId))
    throw new Error("Invalid batch ID");
  const crm = await store.get(`incoming/${batchId}/crm.csv`),
    supplier = await store.get(`incoming/${batchId}/supplier.csv`);
  if (!crm || !supplier)
    throw new Retryable("WAITING_FOR_INPUT: upload supplier then CRM");
  const sourceHash = hash(
    JSON.stringify([hash(crm.text), hash(supplier.text)]),
  );
  const summaryPath = `results/${batchId}/summary.json`;
  const existing = await store.get(summaryPath);
  if (existing) {
    const report = JSON.parse(existing.text) as Report;
    if (report.sourceHash !== sourceHash)
      throw new BatchConflict(
        "Batch ID already committed with different sources",
      );
    await store.putOnce(
      `results/${batchId}/findings.json`,
      JSON.stringify(report.findings, null, 2),
    );
    return report;
  }
  const crmRows = csvInput(crm.text, "CRM"),
    supplierRows = csvInput(supplier.text, "SUPPLIER");
  const findings = reconcile(crmRows, supplierRows);
  const report: Report = {
    batchId,
    sourceHash,
    sourceEtags: { crm: crm.etag, supplier: supplier.etag },
    asOf: SNAPSHOT,
    findings,
    metrics: kpis(crmRows, findings),
    ruleVersion: "1",
  };
  // Content-addressed immutable report holds the complete result. No cross-blob
  // transaction is assumed. summary.json is the final atomic commit pointer/report.
  const immutable = `results/${batchId}/${sourceHash}/findings.json`;
  await store.putOnce(immutable, JSON.stringify(findings, null, 2));
  if (
    (await store.get(`incoming/${batchId}/crm.csv`))?.etag !== crm.etag ||
    (await store.get(`incoming/${batchId}/supplier.csv`))?.etag !==
      supplier.etag
  )
    throw new Retryable("Source changed during ingestion");
  const committed = await store.putOnce(
    summaryPath,
    JSON.stringify(report, null, 2),
  );
  if (!committed) {
    const winner = await store.get(summaryPath);
    if (!winner || JSON.parse(winner.text).sourceHash !== sourceHash)
      throw new BatchConflict("Concurrent batch conflict");
  }
  // Required convenience path is recoverable after a partial failure. Always derives
  // from committed immutable summary; create-only prevents destructive overwrites.
  await store.putOnce(
    `results/${batchId}/findings.json`,
    JSON.stringify(findings, null, 2),
  );
  return report;
}
