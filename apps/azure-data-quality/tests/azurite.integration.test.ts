import { it, expect } from "vitest";
import { BlobServiceClient } from "@azure/storage-blob";
import { readFileSync } from "node:fs";
import { BlobStore } from "../src/blob.js";
import { processBatch } from "../src/pipeline.js";
it("Azurite rejects unsigned source overwrite and persists one retry-safe result set", async () => {
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
    const before = await store.get(`incoming/${batchId}/crm.csv`);
    const sourceUrl = client
      .getContainerClient("incoming")
      .getBlockBlobClient(`${batchId}/crm.csv`).url;
    expect(new URL(sourceUrl).hostname).toBe("127.0.0.1");
    const unsigned = await fetch(sourceUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": "2023-11-03",
        "x-ms-date": new Date().toUTCString(),
      },
      body: "unauthorised synthetic overwrite",
      signal: AbortSignal.timeout(5000),
    });
    await unsigned.text();
    expect(unsigned.status).toBe(403);
    const afterUnsignedAttempt = await store.get(`incoming/${batchId}/crm.csv`);
    expect(afterUnsignedAttempt).toEqual(before);
    console.log(
      JSON.stringify({
        event: "azure_local_unsigned_write",
        unsignedPutStatus: unsigned.status,
        sourceUnchanged:
          afterUnsignedAttempt?.text === before?.text &&
          afterUnsignedAttempt?.etag === before?.etag,
        boundary:
          "Actual loopback Azurite authentication test; Azure cloud Entra/RBAC NOT VERIFIED",
      }),
    );
    const a = await processBatch(store, batchId),
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
