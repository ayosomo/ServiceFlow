import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { type Store } from "./pipeline.js";
export class BlobStore implements Store {
  constructor(private client: BlobServiceClient) {}
  private blob(path: string) {
    const [container, ...name] = path.split("/");
    return this.client
      .getContainerClient(container!)
      .getBlockBlobClient(name.join("/"));
  }
  async get(path: string) {
    try {
      const blob = this.blob(path),
        p = await blob.getProperties();
      if ((p.contentLength ?? 0) > 1024 * 1024)
        throw new Error("File exceeds 1 MiB");
      const bytes = await blob.downloadToBuffer(0, undefined, {
        conditions: { ifMatch: p.etag },
      });
      return { text: bytes.toString("utf8"), etag: p.etag! };
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "statusCode" in e &&
        e.statusCode === 404
      )
        return null;
      throw e;
    }
  }
  async putOnce(path: string, text: string) {
    try {
      await this.blob(path).upload(text, Buffer.byteLength(text), {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
      return true;
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "statusCode" in e &&
        (e.statusCode === 412 ||
          (e.statusCode === 409 &&
            "code" in e &&
            e.code === "BlobAlreadyExists"))
      )
        return false;
      throw e;
    }
  }
}
export function configuredStore() {
  const local = process.env.SOURCE_STORAGE;
  if (
    local &&
    !local.includes("UseDevelopmentStorage=true") &&
    !local.includes("127.0.0.1")
  )
    throw new Error(
      "Connection strings restricted to local emulator; use managed identity in Azure.",
    );
  if (local) {
    const client = BlobServiceClient.fromConnectionString(local);
    const endpoint = process.env.LOCAL_BLOB_SERVICE_URL;
    if (
      endpoint &&
      !/^http:\/\/(azurite|127\.0\.0\.1):10000\/devstoreaccount1$/.test(
        endpoint,
      )
    )
      throw new Error(
        "Explicit local Blob endpoint must target the local Azurite account",
      );
    return new BlobStore(
      endpoint ? new BlobServiceClient(endpoint, client.credential) : client,
    );
  }
  return new BlobStore(
    new BlobServiceClient(
      process.env.SOURCE_STORAGE__blobServiceUri!,
      new DefaultAzureCredential(),
    ),
  );
}
