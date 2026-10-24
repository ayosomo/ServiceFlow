# CV claim ledger

Use only claims supported by the final saved test evidence. Independent portfolio work must be labelled separately from paid professional experience.

## Supported by the local execution evidence

“Built and locally tested a TypeScript service-delivery portfolio with request approval, synthetic CRM/supplier reconciliation and defined operational KPIs, linking BA requirements to automated tests and a PostgreSQL reference.”

“Defined user stories, acceptance criteria, data mappings and traceable quality rules for 48 synthetic requests, distinguishing data defects from approval blockers and delivery risk.”

“Implemented and tested PostgreSQL migrations, relational constraints, joins, window functions and filtered KPI queries in Docker, with independent KPI reconciliation.”

“Validated a local Azure Functions blob-trigger reconciliation flow and a non-root TypeScript container backed by a Firestore emulator, with 25 unit/application tests and three persistence integration tests.”

“Configured and locally verified a reproducible Azure Functions deployment ZIP and identity-based private Blob package/storage infrastructure, with explicit cloud cost and quota gates.”

Evidence: [storage/package runbook](AZURE-PACKAGE-AND-STORAGE.md), [compiled-configuration checks](evidence/azure-configuration-verification.json) and [exact-ZIP host smoke](evidence/azure-package-host.json). Azure cloud deployment remains unverified.

“Reviewed authenticated Google Cloud billing/project/quota evidence and official GBP pricing, then configured and locally verified a 256 MiB authenticated insights container with a documented approval and teardown gate.”

Evidence: [GCP preflight](evidence/gcp-account-preflight.json), [container test](evidence/gcp-proposal-container.json), [configuration](evidence/gcp-configuration-verification.json), [cost scenario and proposal](GCP-DEPLOYMENT-PROPOSAL.md). These preflight records support local engineering and governance; the separate actual-run section below supplies the later cloud claim.

## Supported by subsequent local AWS hardening

“Added and locally tested controls rejecting a submitting principal's own decision, failing closed on missing submission provenance, and recovering idempotent operations after an uncertain database acknowledgement.”

Evidence: [readiness tests](../apps/aws-request-approvals/tests/readiness.test.ts), [DynamoDB Local persistence](../apps/aws-request-approvals/tests/dynamodb.integration.test.ts), [current execution manifest](evidence/phase4-verification.json). At that Phase 4 release, eight new cases brought the unit/application suite to 33; the later local operations iteration is recorded separately below. The database test commits to the actual local emulator before injecting acknowledgement loss; it is not a real AWS outage. These controls are not cloud verified and do not establish independent human separation, effective least privilege, recovery objectives or production readiness. [Prioritised backlog](AWS-PRODUCTION-READINESS.md).

## Supported by actual AWS deployment evidence

“Independent portfolio: deployed and tested an IAM-protected request approval API on AWS Lambda, API Gateway and DynamoDB, with requirements, API contracts, idempotent writes, audit records and verified teardown.”

Evidence: [actual cloud verification](evidence/aws-cloud-verification.json), deployed source commit `e0a49b611d654728a72611ee1a5e7eb571ce4adf`. Fifteen HTTP calls passed, including unsigned and signed wrong-role 403s. One owner exercised all application roles; do not imply independent human approval, production security certification, ongoing hosting or measured savings. Effective least privilege and final delayed billing are not claimed.

## Supported by actual GCP business API and teardown evidence

“Independent portfolio: deployed and tested an IAM-protected Dockerised TypeScript insights API on Google Cloud Run with Firestore, reconciled operational KPIs against a SQL reference and verified resource teardown.”

Evidence: [actual results](GCP-CLOUD-RESULTS.md) and [public-safe provider/test projection](evidence/gcp-cloud-verification.json), deployed source `5e709d648fc2ef0bc68eeb7258d1fd9a9741905c`. This covers working KPI/findings/insight and auth paths. The deployed healthz route failed; its health correction passed locally and was not redeployed. Do not describe the whole application as all checks passing or claim role-aware analytics, permanent hosting, exact zero final cost or production security certification.

## Withheld until independent provider evidence exists

- “Deployed an Azure Functions/Blob Storage reconciliation pipeline.”
- “Deployed the corrected `/health` route to Cloud Run.”
- “Role-aware analytics,” “production-scale performance,” “commercial savings,” or any unmeasured outcome.

Templates and provider documentation do not prove deployment. Record commit ID, passed command log, cloud resource/revision, smoke output and cost/teardown evidence before promoting a claim. This project does not corroborate professional experience claims elsewhere in the handoff; those need their own evidence.

## Supported by subsequent local AWS operations/resilience evidence

“Implemented and locally tested redacted request metrics, server-context correlation and transaction-failure classification, then exercised dependency failure/recovery and concurrent idempotent decisions against DynamoDB Local.”

[Actual commands](evidence/aws-readiness-2-verification.json), [observability tests](../apps/aws-request-approvals/tests/observability.test.ts), [SDK fault cases](../apps/aws-request-approvals/tests/dynamodb-faults.test.ts), [local fault/concurrency exercise](evidence/aws-readiness-2-resilience-dynamodb-local.json). The suite now has 45 unit/application cases; each bounded exercise has 76 service invocations. No production monitoring/alert delivery, accepted load target, measured SDK backoff, live AWS outage recovery or production readiness claim is supported. [Remaining operational gates](AWS-LOCAL-OPERATIONS.md).
