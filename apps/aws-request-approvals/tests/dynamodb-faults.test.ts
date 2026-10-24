import { expect, it, vi } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoRepository } from "../src/dynamodb.js";
import { api } from "../src/service.js";

it.each([
  { codes: ["None", "ConditionalCheckFailed", "None"], expected: 409 },
  {
    codes: ["ConditionalCheckFailed", "ProvisionedThroughputExceeded", "None"],
    expected: 503,
  },
  { codes: ["ThrottlingError", "None", "None"], expected: 503 },
  { codes: ["TransactionConflict", "None", "None"], expected: 503 },
  { codes: [], expected: 503 },
  { codes: ["ConditionalCheckFailed", undefined], expected: 503 },
])(
  "BA-010 maps transaction cancellation $codes to $expected, without leaking SDK details",
  async ({ codes, expected }) => {
    const client = new DynamoDBClient({
      endpoint: "http://127.0.0.1:58000",
      region: "local",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
      maxAttempts: 1,
    });
    const document = DynamoDBDocumentClient.from(client);
    const error = Object.assign(new Error("private synthetic SDK diagnostic"), {
      name: "TransactionCanceledException",
      CancellationReasons: codes.map((Code) => ({ Code })),
    });
    const send = vi
      .spyOn(document, "send")
      .mockImplementation(async (command) => {
        if (command instanceof GetCommand) return {};
        throw error;
      });
    try {
      const result = await api(
        new DynamoRepository("local-fault-fixture", document),
      )({
        method: "POST",
        path: "/requests",
        actor: { id: "synthetic-requester", roles: ["requester"] },
        idempotencyKey: "sdk_fault_create",
        body: JSON.stringify({
          requestId: "REQ-0710",
          customerId: "SYN-710",
          summary: "Synthetic SDK error classification",
          ownerTeam: "Operations",
          priority: "HIGH",
          submittedAt: "2026-10-01T00:00:00.000Z",
          targetAt: "2026-10-30T00:00:00.000Z",
          approvalRequired: true,
        }),
      });
      expect(result.statusCode).toBe(expected);
      expect(JSON.stringify(result.body)).not.toContain("private synthetic");
      expect(send.mock.calls).toHaveLength(expected === 409 ? 3 : 2);
    } finally {
      send.mockRestore();
      client.destroy();
    }
  },
);
