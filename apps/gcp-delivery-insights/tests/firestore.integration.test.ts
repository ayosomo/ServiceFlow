import { it, expect } from "vitest";
import { Firestore } from "@google-cloud/firestore";
import { FirestoreRepository } from "../src/repository.js";
import { createApp } from "../src/app.js";
import { fixtures } from "../../../packages/fixtures/src.js";
import { reconcile, kpis } from "../../../packages/domain/src/index.js";
it("Firestore emulator persists a bounded snapshot and serves independently checked KPIs", async () => {
  const client = new Firestore({
    projectId: "serviceflow-local",
    host: "127.0.0.1:58085",
    ssl: false,
  });
  const id = `integration-${Date.now()}`,
    doc = client.collection("serviceflowSnapshots").doc(id),
    f = fixtures();
  const findings = reconcile(f.crm, f.supplier),
    snapshot = {
      requests: f.crm,
      findings,
      sourceHash: "synthetic-emulator-integration",
    };
  const app = createApp(
    new FirestoreRepository(client, id),
    async () => "synthetic-manager",
  );
  try {
    await doc.create(snapshot);
    expect(await new FirestoreRepository(client, id).load()).toEqual(snapshot);
    const response = await app.inject("/kpis");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject(kpis(f.crm, findings));
    await expect(
      new FirestoreRepository(client, "missing-synthetic-snapshot").load(),
    ).rejects.toThrow("Snapshot not seeded");
  } finally {
    await app.close();
    await doc.delete();
    await client.terminate();
  }
});
