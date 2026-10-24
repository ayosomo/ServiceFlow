import { Firestore } from "@google-cloud/firestore";
import { createHash } from "node:crypto";
import { fixtures } from "../packages/fixtures/src.js";
import { reconcile } from "../packages/domain/src/index.js";
// Deliberately absent from normal build/test/CI. A real write is chargeable.
if (process.env.APPROVED_CLOUD_WRITE !== "explicit-owner-approved")
  throw new Error(
    "Complete COST_GATE and obtain explicit owner approval before this cloud write.",
  );
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId || !projectId.startsWith("serviceflow-"))
  throw new Error("Explicit dedicated serviceflow- project required.");
const f = fixtures();
const data = {
  requests: f.crm,
  findings: reconcile(f.crm, f.supplier),
  sourceHash: createHash("sha256")
    .update(JSON.stringify([f.crm, f.supplier]))
    .digest("hex"),
};
if (Buffer.byteLength(JSON.stringify(data)) > 900000)
  throw new Error("Snapshot exceeds safe document bound");
const firestore = new Firestore({ projectId });
try {
  await firestore
    .collection("serviceflowSnapshots")
    .doc("2026-10-23")
    .create(data);
  console.log(
    "Created one synthetic snapshot; existing documents are never overwritten.",
  );
} finally {
  await firestore.terminate();
}
