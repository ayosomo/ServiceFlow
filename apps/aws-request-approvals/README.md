# AWS — Request and Approval API

All demonstration data is synthetic. Portfolio project, not an employer integration. **Cloud deployment: NOT VERIFIED.**

The Operations analyst submits a complete request; an Approver records a reasoned decision. The service rejects malformed input, missing/wrong-role identity, stale versions and reused keys with a different body. A DynamoDB transaction writes the request, audit event and idempotency receipt. Reads are strongly consistent; event history is bounded to 50 recent entries.

Local: set LOCAL_API_TOKEN to a random 24+ character value in your shell and run `pnpm aws:local`. The server binds 127.0.0.1:3101 and uses in-memory persistence. Send Authorization: Bearer <local token>; mutating requests also require Idempotency-Key. The [OpenAPI](openapi.yaml) is the HTTP contract; [tests](tests/api.test.ts) demonstrate acceptance and failure behaviour. It is not an IAM emulator.

DynamoDB Local integration: `docker compose up -d dynamodb`, then run `pnpm test:integration` (also requires Azurite). This creates and deletes a uniquely named local table only; credentials are the emulator's dummy values. Do not point the test at real AWS.

## Manual deployment runbook (blocked by cost gate)

1. Install AWS/SAM tooling through the provider's documented installer; authenticate with SSO/profile outside chat. Inspect Billing and complete [COST_GATE](../../docs/COST_GATE.md).
2. Run all local checks. Run `pnpm build`; dist/lambda.js includes SDK dependencies, and dist/package.json explicitly selects CommonJS for the SAM handler.
3. Run `sam validate --lint --template-file apps/aws-request-approvals/template.yaml` and `sam build --template-file apps/aws-request-approvals/template.yaml` after `pnpm build`. Both passed with workspace-local SAM 1.170.0. SkipBuild metadata deliberately packages the already-built Lambda bundle; this does not invoke Lambda or deploy AWS resources.
4. Review transformed IAM, resource list, region, runtime, packaging and account quotas. Concurrency 1 can be unavailable in some account configurations; inspect before deployment, do not silently remove the limit.
5. Obtain explicit owner approval before `sam deploy --guided`. Use a dedicated stack/serviceflow project tag. Do not upgrade a Free plan to Paid to bypass service restrictions.
6. Pass exact API Gateway-reported principal ARNs into requester/approver/reader parameters; no wildcard allowlists. Assumed-role session ARNs differ from IAM role ARNs: inspect redacted request context during a controlled call and deliberately configure the right principal representation. Grant callers only execute-api:Invoke on intended routes. Role checks fail closed for unlisted principals.
7. Use a SigV4 client with the local credential provider chain (never copy keys into code/chat). Submit, reread, decide, replay, test stale version, and attempt the same POST unsigned. Unsigned must return 401/403 and no side effects. Save redacted outputs and audit evidence.
8. Inspect CloudWatch retention, request counts, DynamoDB capacity/storage and Billing. Run `sam delete --stack-name <dedicated-stack> --region <approved-region>` after evidence capture, including stack-managed table/log resources. Check/delete the deployment S3 artefacts/bucket if dedicated and no longer needed. Recheck delayed billing.

No live URL or deployed IAM capability may be claimed until this runbook succeeds. Transaction operation permissions use item-level dynamodb:PutItem on this table; no table scan or admin runtime role is granted.
