import { it, expect } from "vitest";
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoRepository } from "../src/dynamodb.js";
import { api } from "../src/service.js";
import { generatedRequestIdSchema } from "../../../packages/domain/src/index.js";
it("DynamoDB Local commits audit and receipt atomically and rejects duplicate writes", async () => {
  const client = new DynamoDBClient({
    endpoint: "http://127.0.0.1:58000",
    region: "local",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
    maxAttempts: 1,
  });
  const table = `serviceflow-local-${Date.now()}`;
  await client.send(
    new CreateTableCommand({
      TableName: table,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    }),
  );
  try {
    const repo = new DynamoRepository(
        table,
        DynamoDBDocumentClient.from(client),
      ),
      run = api(repo);
    const actor = {
      id: "synthetic-integration",
      roles: ["requester", "approver"] as ("requester" | "approver")[],
    };
    const create = {
      method: "POST",
      path: "/requests",
      actor,
      idempotencyKey: "integration_create",
      body: JSON.stringify({
        requestId: "REQ-0199",
        customerId: "SYN-199",
        summary: "Synthetic integration request",
        ownerTeam: "Operations",
        priority: "HIGH",
        submittedAt: "2026-10-01T00:00:00.000Z",
        targetAt: "2026-10-30T00:00:00.000Z",
        approvalRequired: true,
      }),
    };
    expect((await run(create)).statusCode).toBe(201);
    expect((await run(create)).statusCode).toBe(201);
    expect(
      (await run({ ...create, idempotencyKey: "duplicate_create" })).statusCode,
    ).toBe(409);
    const beforeDecision = await repo.get("REQ-0199");
    const decision = {
      method: "POST",
      path: "/requests/REQ-0199/decision",
      actor: { id: "synthetic-independent-approver", roles: actor.roles },
      idempotencyKey: "integration_decision",
      body: JSON.stringify({
        decision: "APPROVED",
        reason: "Integration acceptance",
        version: 1,
      }),
    };
    expect((await run({ ...decision, actor })).statusCode).toBe(403);
    expect(await repo.get("REQ-0199")).toEqual(beforeDecision);
    const save = repo.save.bind(repo);
    let loseAcknowledgement = true;
    repo.save = async (...args) => {
      await save(...args);
      if (loseAcknowledgement) {
        loseAcknowledgement = false;
        throw new Error(
          "Synthetic acknowledgement lost after real local commit",
        );
      }
    };
    expect((await run(decision)).statusCode).toBe(503);
    expect((await repo.get("REQ-0199"))?.request.version).toBe(2);
    expect((await run(decision)).statusCode).toBe(200);
    expect(await repo.get("REQ-0199")).toMatchObject({
      request: { status: "APPROVED", version: 2 },
    });
    expect((await repo.get("REQ-0199"))?.events).toHaveLength(2);
    const noId = JSON.parse(create.body);
    delete noId.requestId;
    const uuidCreate = {
      ...create,
      idempotencyKey: "integration_uuid_create",
      body: JSON.stringify(noId),
    };
    const created = await run(uuidCreate);
    expect(created.statusCode).toBe(201);
    const uuid = generatedRequestIdSchema.parse(
      (created.body as { requestId: string }).requestId,
    );
    expect((await run(uuidCreate)).body).toEqual(created.body);
    expect(
      (await run({ method: "GET", path: `/requests/${uuid}`, actor }))
        .statusCode,
    ).toBe(200);
    const uuidDecision = {
      ...decision,
      path: `/requests/${uuid}/decision`,
      idempotencyKey: "integration_uuid_decision",
    };
    expect((await run(uuidDecision)).statusCode).toBe(200);
    expect((await run(uuidDecision)).statusCode).toBe(200);
    expect((await repo.get(uuid))?.request).toMatchObject({
      requestId: uuid,
      status: "APPROVED",
      version: 2,
    });
    expect((await repo.get(uuid))?.events).toHaveLength(2);
  } finally {
    await client.send(new DeleteTableCommand({ TableName: table }));
    client.destroy();
  }
});
