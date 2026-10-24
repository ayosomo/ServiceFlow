import { type Call, type Repository } from "./service.js";
import { execution, type RequestMetric } from "./execution.js";
import { DynamoRepository } from "./dynamodb.js";
export interface GatewayEvent {
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
export function gatewayHandler(
  repo: Repository,
  emit: (metric: RequestMetric) => void,
) {
  const run = execution(repo, emit);
  return async (event: GatewayEvent) => {
    const result = await run({
      method: event.requestContext?.http?.method ?? "",
      path: event.rawPath ?? "",
      body: event.isBase64Encoded
        ? Buffer.from(event.body ?? "", "base64").toString("utf8")
        : event.body,
      actor: principal(event.requestContext?.authorizer?.iam?.userArn),
      idempotencyKey: event.headers?.["idempotency-key"],
      correlationId: event.requestContext?.requestId,
    });
    return {
      statusCode: result.statusCode,
      headers: result.headers,
      body: JSON.stringify(result.body),
    };
  };
}
export async function handler(event: GatewayEvent) {
  return gatewayHandler(
    new DynamoRepository(process.env.TABLE_NAME!),
    (metric) => console.log(JSON.stringify(metric)),
  )(event);
}
