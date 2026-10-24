import { app } from "@azure/functions";
import { configuredStore } from "./blob.js";
import { processBatch } from "./pipeline.js";
app.storageBlob("reconcileCrm", {
  path: "incoming/{batchId}/crm.csv",
  connection: "SOURCE_STORAGE",
  handler: async (_blob, context) => {
    const batchId = String(context.triggerMetadata?.batchId ?? "");
    const report = await processBatch(configuredStore(), batchId);
    context.log(
      JSON.stringify({
        correlationId: context.invocationId,
        batchId,
        sourceHash: report.sourceHash,
        findingCount: report.findings.length,
      }),
    );
  },
});
