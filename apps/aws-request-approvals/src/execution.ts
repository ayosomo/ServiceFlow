import { randomUUID } from "node:crypto";
import { api, type Call, type Repository } from "./service.js";

export interface RequestMetric {
  event: "request_completed";
  correlationId: string;
  operation: "create" | "read" | "decision" | "health" | "unknown";
  statusCode: number;
  durationMs: number;
  outcome: "success" | "client_rejected" | "server_error";
}

// Bounded operation names avoid logging caller paths, bodies, principals or keys.
function operation(call: Call): RequestMetric["operation"] {
  if (call.method === "GET" && call.path === "/healthz") return "health";
  if (call.method === "POST" && call.path === "/requests") return "create";
  if (call.method === "GET" && /^\/requests\/REQ-\d{4}$/.test(call.path))
    return "read";
  if (
    call.method === "POST" &&
    /^\/requests\/REQ-\d{4}\/decision$/.test(call.path)
  )
    return "decision";
  return "unknown";
}

export function execution(
  repo: Repository,
  emit: (metric: RequestMetric) => void,
  elapsed = () => performance.now(),
) {
  const run = api(repo);
  return async (call: Call) => {
    // Only server-provided correlation IDs enter Call; transport headers are ignored.
    const correlationId = /^[A-Za-z0-9_-]{1,100}$/.test(
      call.correlationId ?? "",
    )
      ? call.correlationId!
      : randomUUID();
    const start = elapsed();
    const result = await run({ ...call, correlationId });
    const metric: RequestMetric = {
      event: "request_completed",
      correlationId,
      operation: operation(call),
      statusCode: result.statusCode,
      durationMs: Math.max(0, Math.round(elapsed() - start)),
      outcome:
        result.statusCode >= 500
          ? "server_error"
          : result.statusCode >= 400
            ? "client_rejected"
            : "success",
    };
    try {
      emit(metric);
    } catch {
      /* A log sink failure must not change a committed business result. */
    }
    return {
      ...result,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
      },
    };
  };
}
