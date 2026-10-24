import { it, expect } from "vitest";
import { BlobServiceClient } from "@azure/storage-blob";
import { readFileSync } from "node:fs";
import { BlobStore } from "../src/blob.js";
import { processBatch } from "../src/pipeline.js";
it("Azurite persists immutable sources and one retry-safe result set", async () => {
  const client = BlobServiceClient.fromConnectionString(
    "UseDevelopmentStorage=true",
  );
  for (const name of ["incoming", "results"])
    await client.getContainerClient(name).createIfNotExists();
  const batchId = `integration-${Date.now()}`;
  const store = new BlobStore(client);
  try {
    for (const source of ["supplier", "crm"]) {
      const text = readFileSync(`packages/fixtures/data/${source}.csv`, "utf8");
      await client
        .getContainerClient("incoming")
        .getBlockBlobClient(`${batchId}/${source}.csv`)
        .upload(text, Buffer.byteLength(text));
    }
    const before = await store.get(`incoming/${batchId}/crm.csv`),
      a = await processBatch(store, batchId),
      b = await processBatch(store, batchId);
    expect(a).toEqual(b);
    expect(a.metrics.totalRecords).toBe(48);
    expect(await store.get(`incoming/${batchId}/crm.csv`)).toEqual(before);
    expect(await store.get(`results/${batchId}/summary.json`)).not.toBeNull();
  } finally {
    for (const name of ["incoming", "results"])
      for await (const blob of client
        .getContainerClient(name)
        .listBlobsFlat({ prefix: `${batchId}/` }))
        await client.getContainerClient(name).deleteBlob(blob.name);
  }
});
