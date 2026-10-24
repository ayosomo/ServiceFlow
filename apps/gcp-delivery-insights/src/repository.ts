import { Firestore } from "@google-cloud/firestore";
import { type Raw, type Finding } from "../../../packages/domain/src/index.js";
export interface Snapshot {
  requests: Raw[];
  findings: Finding[];
  sourceHash: string;
}
export interface InsightsRepository {
  load(): Promise<Snapshot>;
}
export class FixtureRepository implements InsightsRepository {
  constructor(private snapshot: Snapshot) {}
  async load() {
    return structuredClone(this.snapshot);
  }
}
export class FirestoreRepository implements InsightsRepository {
  constructor(
    private firestore = new Firestore(),
    private snapshotId = "2026-10-23",
  ) {}
  async load(): Promise<Snapshot> {
    const record = await this.firestore
      .collection("serviceflowSnapshots")
      .doc(this.snapshotId)
      .get();
    if (!record.exists) throw new Error("Snapshot not seeded");
    const data = record.data();
    if (
      !data ||
      !Array.isArray(data.requests) ||
      !Array.isArray(data.findings) ||
      data.requests.length > 200 ||
      typeof data.sourceHash !== "string"
    )
      throw new Error("Invalid snapshot");
    return data as Snapshot;
  }
}
