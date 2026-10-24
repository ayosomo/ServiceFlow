# AWS deployment proposal — approved and completed

Review date: 24 October 2026. Owner subsequently explicitly approved this exact deployment, tests and teardown in chat. The run completed and all dedicated resources were removed. [Actual evidence](evidence/aws-cloud-verification.json). The proposal below preserves the scope that was approved; it is not standing permission for another deployment. All data is fictional.

The subsequent local BA-007/008 hardening is outside this historical run. A new proposal must review distinct requester/approver identities, stable subject mapping and the fail-closed provenance migration boundary; the earlier one-owner smoke cannot verify those controls. [Production-readiness backlog](AWS-PRODUCTION-READINESS.md).

## Scope to approve

Deploy one temporary `serviceflow-aws-demo` CloudFormation stack in **eu-north-1 (Stockholm)** using the existing `serviceflow` profile. Keep the account on its verified ACTIVE FREE plan. Run the bounded smoke sequence below, capture redacted evidence, then remove the dedicated resources in the same working session, aiming for a deployment lifetime of **at most one hour**. If cleanup fails, report the exact remaining resources immediately and prioritise removal; one hour is an operating target, not an automated expiry.

| Resource                      | Quantity / configuration                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lambda                        | 1, Node.js 22, 128 MiB, 10-second timeout, reserved concurrency 1                                                                                      |
| API Gateway HTTP API          | 1, `$default` stage, four existing routes, AWS_IAM on every route; throttle 2 requests/second, burst 5                                                 |
| DynamoDB                      | 1 Standard table, 1 provisioned RCU + 1 WCU, no autoscaling, backups, streams or global replicas                                                       |
| CloudWatch Logs               | 1 function log group, seven-day retention; delete with stack after capture                                                                             |
| Runtime IAM role              | 1 Lambda service role; explicit table GetItem/Query/PutItem policy and AWSLambdaBasicExecutionRole logging policy                                      |
| Lambda invocation permissions | 4 API Gateway permissions scoped to this API's existing routes                                                                                         |
| Packaging storage             | 1 dedicated private regional S3 bucket with public access blocked, containing only the deployment artefacts; delete objects and bucket during teardown |

An offline SAM transform produced the ten stack resources listed above (API and stage are separate resources). Its synthetic packaging placeholder was used only for local inspection; no S3 upload occurred. CloudFormation's read-only validate-template API passed. A CloudFormation change set must be inspected before execution; reject additions outside this list. No managed SAM shared bucket is needed.

The existing owner principal will be the sole demo caller, explicitly allowlisted as requester, approver and reader. This demonstrates one operator exercising three application permissions; it does not demonstrate independent human approval or separation of duties. Do not create access keys, new human identities, GitHub OIDC roles or public S3 access.

## Verified checks and cost basis

- STS identity, Node SDK credential resolution and SAM Python login credential resolution passed without printing credentials.
- Lambda total/unreserved concurrency is 400/400. Reserving 1 leaves more than AWS's required 100 unreserved executions. DynamoDB table capacity limits exceed the proposed 1/1.
- Free Tier API confirms ACTIVE FREE plan. Actual credits, expiration and billing balance are recorded privately. AWS documents no charges while on the Free plan; the demo is conditional on that plan remaining active. [Free plan terms](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).
- The new project experience lists all proposed services in its Free Tier. Exact provisioning remains unverified until deployment. [Supported services](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html).
- No more than 100 HTTP calls, fewer than 20 mutations, under 1 MiB table data and a small Lambda bundle. **Expected new cash spend: £0 under the verified Free plan.** Credit consumption has not been measured or represented as an exact estimate. No Paid upgrade, Organizations enrolment, advanced-feature activation, subscription, custom domain or quota increase is included.
- Budget listing returned exit 0 with an empty response, including without pagination; budget count and notifications remain UNKNOWN. This is not evidence of an alert or spend cap. The active Free plan is the financial protection for this proposal; if the plan becomes Paid, stop before provisioning or further traffic.

## Known limits and stop conditions

The new experience has managed project IAM defaults that can grant application code broad access within the project. The template's narrow explicit table policy does not prove effective least privilege. Use synthetic data only; do not claim a production security review. [Access defaults](https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html).

Regional log listing succeeds in eu-north-1, but AWS's project-region guide describes CloudWatch Logs availability in us-east-1. Log-group creation in the home region is not yet verified. Attempt only the proposed regional stack; if unsupported, roll back and report it. Do not deploy cross-region infrastructure, drop logs, remove the concurrency limit or change the architecture to bypass a restriction. [Region guidance](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html).

Stop if the account is not ACTIVE FREE, credits are depleted, the project/profile is wrong, a service requires an upgrade, the change set expands this scope, or IAM/region restrictions prevent the design. Roll back only this task's dedicated resources; preserve any pre-existing resources.

## Smoke, evidence and teardown

1. Recheck plan/profile and resource names; run required local checks for any code changes, and build the existing bundle. Record commit/template hash.
2. Create the dedicated private artefact bucket, package, inspect the change set, then deploy the approved stack. Record actual resource status; a successful template validation is not deployment evidence.
3. With signed requests: health, create, reread, approve, idempotent replay and conflicting/stale decision. With an unsigned request: verify 401/403 and unchanged stored request/audit state. A temporary reader-only allowlist configuration may be used to verify signed mutation denial, then restored; no new caller roles are included.
4. Independently inspect the created DynamoDB request/audit/receipt and log correlation/status. Keep raw account/principal identifiers and credential material outside public evidence.
5. Delete the dedicated stack, verify its table/function/API/log group/role are gone, then remove only this task's dedicated packaging objects and bucket. Record residual resources and errors truthfully.
6. Recheck remaining credits and visible billing after cleanup; delayed billing may need a later owner check. Publish only redacted evidence. Proceed to Azure deployment review after AWS evidence is complete.

Approval must explicitly cover **deployment, bounded test traffic and teardown of this exact temporary AWS demo**. Local-access approval alone does not cover these actions.
