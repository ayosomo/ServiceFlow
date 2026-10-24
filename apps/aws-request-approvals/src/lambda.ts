import { api, type Call } from "./service.js";
import { DynamoRepository } from "./dynamodb.js";
interface GatewayEvent {
  requestContext?: {
    authorizer?: { iam?: { userArn?: string } };
    http?: { method?: string };
    requestId?: string;
  };
  rawPath?: string;
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
}
export function principal(arn: string | undefined): Call["actor"] {
  if (!arn) return undefined;
  const roles: NonNullable<Call["actor"]>["roles"] = [];
  for (const [name, role] of [
    ["REQUESTER_ARNS", "requester"],
    ["APPROVER_ARNS", "approver"],
    ["READER_ARNS", "reader"],
  ] as const)
    if ((process.env[name] ?? "").split(",").filter(Boolean).includes(arn))
      roles.push(role);
  return roles.length ? { id: arn, roles } : undefined;
}
export async function handler(event: GatewayEvent) {
  const result = await api(new DynamoRepository(process.env.TABLE_NAME!))({
    method: event.requestContext?.http?.method ?? "",
    path: event.rawPath ?? "",
    body: event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body,
    actor: principal(event.requestContext?.authorizer?.iam?.userArn),
    idempotencyKey: event.headers?.["idempotency-key"],
    correlationId: event.requestContext?.requestId,
  });
  console.log(
    JSON.stringify({
      correlationId: event.requestContext?.requestId,
      statusCode: result.statusCode,
    }),
  );
  return {
    statusCode: result.statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify(result.body),
  };
}
