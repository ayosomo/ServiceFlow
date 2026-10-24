import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Conflict, type Repository, type Receipt } from "./service.js";
import {
  type ServiceRequest,
  type AuditEvent,
} from "../../../packages/domain/src/index.js";
export class DynamoRepository implements Repository {
  constructor(
    private table: string,
    private client = DynamoDBDocumentClient.from(
      new DynamoDBClient({ maxAttempts: 3 }),
    ),
  ) {}
  async receipt(key: string) {
    const r = await this.client.send(
      new GetCommand({
        TableName: this.table,
        Key: { pk: `IDEMP#${key}`, sk: "RECEIPT" },
        ConsistentRead: true,
      }),
    );
    return (r.Item?.data as Receipt) ?? null;
  }
  async get(id: string) {
    const r = await this.client.send(
      new GetCommand({
        TableName: this.table,
        Key: { pk: id, sk: "REQUEST" },
        ConsistentRead: true,
      }),
    );
    if (!r.Item) return null;
    const events = await this.client.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "pk = :p AND begins_with(sk,:s)",
        ExpressionAttributeValues: { ":p": id, ":s": "EVENT#" },
        ScanIndexForward: false,
        Limit: 50,
        ConsistentRead: true,
      }),
    );
    return {
      request: r.Item.data as ServiceRequest,
      events: events.Items?.map((i) => i.data as AuditEvent) ?? [],
    };
  }
  async save(
    request: ServiceRequest,
    event: AuditEvent,
    key: string,
    receipt: Receipt,
    expectedVersion?: number,
  ) {
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.table,
                Item: {
                  pk: request.requestId,
                  sk: "REQUEST",
                  version: request.version,
                  data: request,
                },
                ConditionExpression:
                  expectedVersion === undefined
                    ? "attribute_not_exists(pk)"
                    : "#v = :v",
                ...(expectedVersion === undefined
                  ? {}
                  : {
                      ExpressionAttributeNames: { "#v": "version" },
                      ExpressionAttributeValues: { ":v": expectedVersion },
                    }),
              },
            },
            {
              Put: {
                TableName: this.table,
                Item: {
                  pk: request.requestId,
                  sk: `EVENT#${event.occurredAt}#${event.eventId}`,
                  data: event,
                },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
            {
              Put: {
                TableName: this.table,
                Item: { pk: `IDEMP#${key}`, sk: "RECEIPT", data: receipt },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
          ],
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException" &&
        "CancellationReasons" in error &&
        Array.isArray(error.CancellationReasons) &&
        error.CancellationReasons.some(
          (r: { Code?: string }) => r.Code === "ConditionalCheckFailed",
        )
      )
        throw new Conflict();
      throw error;
    }
  }
}
