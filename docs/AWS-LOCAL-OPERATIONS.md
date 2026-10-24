# AWS local operations and resilience evidence

All demonstration data is synthetic. Portfolio project, not an employer integration.

This iteration advances the **local portions of AWS-P07 and AWS-P09**. Neither item is production-complete: service targets, load envelope, alert recipients/delivery and live AWS validation remain open. No cloud resource, monitoring subscription, provider API call or upgrade is required by the commands below.

## Handler observability contract — BA-009

Lambda and the loopback server share an execution wrapper. Each completed application-handler call emits one JSON record with only `event`, `correlationId`, `operation`, `statusCode`, `durationMs` and `outcome`. Operation is one of create/read/decision/health/unknown; outcome is success/client_rejected/server_error. Duration measures the handler/service call using a monotonic clock. It excludes platform/gateway time and cold-start work outside that wrapper.

Raw paths, query strings, request IDs from payloads, actor identities, customer values, bodies, reasons, tokens, idempotency keys, SDK exceptions and stack traces are not emitted by this record. Correlation comes from server context, never caller correlation/principal headers. Invalid context IDs are replaced with a UUID; responses include the selected `x-correlation-id` and `cache-control: no-store`. Audit for a newly committed operation records that ID. A replay has its own response correlation and retains the original audit, without another event.

Logging is best effort. A failing log sink cannot change a committed result or trigger another business mutation; delivery is not guaranteed. These records cover calls that reach the application handler. Gateway IAM rejection, gateway throttling, runtime termination and local parser rejection can occur before it; they require separate platform telemetry. A generic server_error is not proof of provider throttling or database outage. `/healthz` remains authenticated process liveness and can return 200 while persistence is unavailable.

## Bounded fault exercise — BA-010

Run `pnpm aws:resilience` for memory, or start the existing DynamoDB Local service and run `pnpm aws:resilience dynamodb-local`. The latter fixes its endpoint to `http://127.0.0.1:58000`, uses dummy credentials, and creates/deletes one unique local table; no endpoint override/cloud mode exists. Do not route the loopback port to AWS.

Each mode executes 76 actual service invocations across five scenarios:

1. Ten failed reads and ten failed create attempts during injected dependency unavailability: bounded 503s, unchanged existing record, no new request. A liveness 200 is explicitly not readiness.
2. Restore the dependency and retry the same create key/body: two 201 responses, one persisted submission event.
3. Commit a decision then inject loss of its acknowledgement: first response 503; unchanged retry 200, version 2 and two total events.
4. Sixteen competing decisions on one ID: exactly one 200, one version increment/decision event. Losers may return 409 or retryable 503 for local transaction contention.
5. Sixteen simultaneous identical-key decisions, followed by sixteen unchanged reconciliation retries: every reconciliation returns 200, with one version increment/decision event.

The wrapper injects faults at the repository boundary; this is not a real AWS outage or measured SDK backoff experiment. The helper preserves failed runs in separate dated files and removes only its own local table. It records per-call metrics, status counts and observed local duration samples. No production threshold is asserted. Even zero-millisecond memory samples are retained as measured rather than marketed as performance.

SDK cancellation tests separately distinguish conditional-only failures (409) from capacity/throttling/transaction-contention/missing diagnostic cases (503). Mixed conditional and capacity errors must not be presented as a definitive business conflict. Real provider error behaviour remains unverified for this code.

## Reviewer/operator workflow

- Use [command evidence](evidence/aws-readiness-2-verification.json), [memory exercise](evidence/aws-readiness-2-resilience-memory.json) and [actual DynamoDB Local exercise](evidence/aws-readiness-2-resilience-dynamodb-local.json). The metrics form a local inspection view, not a hosted dashboard.
- Group request counts by bounded operation/status/outcome; inspect server-error counts and duration distribution. Correlation IDs are diagnostic joins, not metric dimensions or labels for a paid high-cardinality service.
- A 503 mutation outcome is uncertain: retry unchanged identity/path/key/body with bounded backoff and reconcile request/audit. Never switch to a new key automatically. A 409 requires a state/business conflict review; a 403 requires identity/role review rather than broader permissions.
- Before enabling real monitoring, agree error/latency/availability targets, gateway/runtime/dependency coverage, detection windows, alert recipient, incident owner and log retention/cost. Then explicitly approve resources and demonstrate a controlled alarm delivery/recovery. None is configured here.

## Release boundaries and remaining work

The original AWS demo source remains `e0a49b611d654728a72611ee1a5e7eb571ce4adf`. Later principal/provenance, metrics and error-classification changes are **local-only**. Azure cloud stays NOT VERIFIED; GCP's corrected health route stays local-only. Earlier Phase 4 source-hash records describe their historical source tree, not this later code. Current code/evidence hashes are recorded separately for this iteration.

[Backlog](AWS-PRODUCTION-READINESS.md), [observable contract tests](../apps/aws-request-approvals/tests/observability.test.ts), [SDK fault tests](../apps/aws-request-approvals/tests/dynamodb-faults.test.ts), [exercise source](../scripts/aws-resilience.ts). Owner UAT, stable human identity, effective IAM, backup/restore and retention, release/rollback, identifier capacity, accepted service targets and fresh cost/deployment approval remain release blockers.

Design references: [AWS Node.js Lambda logging and input-log precautions](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html), [DynamoDB transaction conflict/error behaviour](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), [AWS reliability testing](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/test-reliability.html). Provider documentation is guidance; the linked local outputs are the execution evidence.
