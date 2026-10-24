# Test evidence and reproducibility

The [per-lab Definition of Done audit](DEFINITION-OF-DONE.md) links all eleven supplied gates to evidence and explicitly keeps Azure provisioning on hold/cloud NOT VERIFIED. The follow-up strengthens the existing Azurite integration with actual unsigned-write 403 and unchanged-source bytes/ETag assertions; [local output](evidence/dod-azure-unsigned-response.txt), [verification](evidence/dod-local-verification.json). The existing test count remains three persistence integrations; no extra test count or cloud role-verification claim is invented.

Evidence is recorded in docs/evidence. Tests exercise business acceptance and failure effects; cloud smoke evidence is separate. See IMPLEMENTATION_STATUS.md for the final observed results.

Run from the repository root using Node 22 or the recorded local Node 24:

```sh
pnpm install --frozen-lockfile
pnpm fixtures
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose up -d --wait postgres dynamodb azurite firestore
pnpm db:migrate
pnpm db:seed
pnpm db:test
pnpm db:explain
pnpm test:integration
pnpm azure:batch
docker compose --profile hosts up -d --build azure-functions
pnpm azure:host-test
docker build -f apps/gcp-delivery-insights/Dockerfile -t serviceflow-insights:local .
pnpm test:container
```

db:seed replaces only this local lab's fixture tables. Use the example local database, never an unrelated database URL. All fixture seed writes use parameterised values. SQL negative tests use rollback-only savepoints.

Observed early runs: first 13 shared/AWS tests passed; strict typecheck exposed a supplier index-signature mismatch and nullable trigger metadata; both were corrected. The first Azure count assertion expected 10 findings but actual fixture analysis proved 12, including separate missing/invalid-ID evidence and a secondary chronology/date discrepancy. Expected rule counts were corrected after inspection, without changing raw inputs to force a pass.

Docker initially failed because a stale WSL VM held its disk. After the owner-approved Windows restart the real engine/hello-world checks passed, followed by actual Docker database/emulator/host/container checks. Native PostgreSQL evidence remains labelled separately; neither local route proves live cloud deployment.

| Executed check                                                             | Result                              | Saved evidence                                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 25 unit/application tests                                                  | PASS                                | [test.txt](evidence/test.txt)                                                                                 |
| DynamoDB/Azurite/Firestore persistence integrations                        | 3 PASS                              | [integration-all.txt](evidence/integration-all.txt)                                                           |
| PostgreSQL Docker reference, PK/FK/chronology, latest update               | PASS                                | [db-test-docker.txt](evidence/db-test-docker.txt)                                                             |
| Actual SQL plan                                                            | Captured; tiny dataset only         | [db-explain-docker.txt](evidence/db-explain-docker.txt)                                                       |
| Functions v4 trigger -> Blob report                                        | PASS                                | [azure-functions-host.json](evidence/azure-functions-host.json)                                               |
| Non-root container -> Firestore emulator -> HTTP KPIs                      | PASS                                | [gcp-container.json](evidence/gcp-container.json)                                                             |
| Local AWS intake/decision/replay/409/audit + compiled GCP HTTP             | PASS                                | [http-local-smoke.txt](evidence/http-local-smoke.txt)                                                         |
| SAM validation/package and Azure Bicep compilation                         | PASS locally                        | [SAM](evidence/sam-validate.txt), [build](evidence/sam-build.txt), [Bicep](evidence/infrastructure-local.txt) |
| Runtime advisory check                                                     | 0 high/critical; 1 moderate         | [audit](evidence/dependency-audit.json)                                                                       |
| Actual AWS signed/unsigned/reader-only HTTP, DynamoDB audit/receipts, logs | 15 calls PASS; 10 mutation attempts | [AWS cloud verification](evidence/aws-cloud-verification.json)                                                |
| Independent AWS resource teardown checks                                   | 7 PASS                              | [AWS cleanup](evidence/aws-cloud-verification.json)                                                           |

Actual Azure host testing exposed a .NET/Node difference in DevelopmentStorageProxyUri parsing: the trigger reached port 10000 while Node tried port 80. An allowlisted, explicit local Blob endpoint fixed the integration; the cloud path still uses managed identity. The failed batch reached the local poison queue and did not produce a false PASS. The successful fresh batch is recorded separately. Lint also exposed generated scratch bundles being scanned; scratch is now excluded while source lint remains enabled.

PostgreSQL's canonical overdue EXPLAIN returns 13 rows from the 48 valid canonical fixtures; the dirty-source KPI returns 9 from 20 eligible active rows. These are deliberately different universes. The plan illustrates index access and buffer activity; its timings under local container/build load do not prove production performance.

The earlier Windows screenshot helper approval timed out. Phase 4 now supplies explicitly labelled browser screenshots of saved actual execution records, with [source hashes and capture provenance](evidence/SCREENSHOTS.md). They are not original cloud-console captures or new cloud tests. No product browser UI or accessibility audit is claimed.

## Azure package/storage follow-up — 24 October 2026

The final ZIP passed byte-for-byte rebuild, CRC/root checks and rejection of a synthetic local.settings.json probe. Both final Bicep templates compiled with 0.48.1; compiled ARM identity, private-storage, Shared Key disabled, no Azure Files/connection strings and scale-one invariants passed. The exact ZIP was mounted read-only in the Node 22 Functions host and produced the expected 48-record/12-finding report. Lint, typecheck and all 25 unit/application tests passed during this change. No new real Azure deployment is claimed. [Configuration checks](evidence/azure-configuration-verification.json), [exact ZIP host](evidence/azure-package-host.json), [account/quota checks](evidence/azure-account-preflight.json), [retail-cost scenario](evidence/azure-retail-cost-scenario.json).

Only Microsoft.Web registration was explicitly approved and performed. The resulting UK South Y1 quota is 0/0, so deployment remains on hold. The later credit-summary/lots recheck resolved current balance/direct expiry privately; ActualCost returns no rows, not measured final zero billing. No quota increase, paid-plan upgrade or chargeable resource was created. [Latest account evidence](evidence/azure-free-recheck.json).

## GCP proposal configuration follow-up — 24 October 2026

The same actual Node 22 non-root image passed with a Docker-enforced 268,435,456-byte memory limit: anonymous/invalid-token 403, authenticated 200 and exact KPI response through the Firestore emulator. Its smoke helper now asserts that memory limit and can preserve an alternate dated evidence file. The test container/document were removed and only the emulator started for this test was stopped. [Actual container result](evidence/gcp-proposal-container.json).

Fourteen local manifest assertions passed for service/revision min/max, request CPU billing, boost disabled, memory/CPU/concurrency/timeout, matching custom audience, no local auth mode, no IAM bypass annotation and intentionally unresolved deployment placeholders. This is configuration evidence, not Google server-side validation or live IAM proof. [Manifest checks](evidence/gcp-configuration-verification.json). Quota and price reads are actual API observations; the monetary scenario remains a model. [Exact proposal](GCP-DEPLOYMENT-PROPOSAL.md).

Lint, strict typecheck, all 25 unit/application tests and all three Node 22 builds passed for this follow-up. [Command results](evidence/gcp-proposal-checks.json); per-command transcripts use the `gcp-proposal-` prefix. The tests are local; no provider smoke was run.

## Actual GCP run and local health correction — 24 October 2026

The approved London business API run and active-resource teardown are now recorded in [actual cloud evidence](evidence/gcp-cloud-verification.json). 28 HTTP attempts include failed routing/permission diagnostics; exact KPI, auth, filtering, insight and unchanged-snapshot checks passed. Deployed healthz failed; health correction was not redeployed. [Scope and failures](GCP-CLOUD-RESULTS.md).

The local correction passed lint/typecheck/25 tests/build, authorised loopback HTTP and a 256 MiB non-root Docker/Firestore-emulator retry, including authenticated health 200 and exact KPIs. The first container attempt timed out; both it and the initially sandboxed HTTP startup failure are retained as failures, followed by successful reruns. [Correction checks](evidence/gcp-health-fix-checks.json), [container](evidence/gcp-health-fix-container.json), [HTTP](evidence/gcp-health-fix-http.txt). No second cloud image/revision or cloud health-fix pass is claimed.

## Phase 4 and local AWS readiness extension

The original 25-test counts above describe earlier source. The current suite contains 33 unit/application cases after adding eight same-principal/provenance/uncertain-write cases. The local HTTP check now uses distinct synthetic requester/approver credentials and records denied-requester state before approval. Actual DynamoDB Local persistence is tested with an injected failure after commit, proving replay without duplicate audit. This is not a live AWS outage or cloud verification of the new code.

[Current execution manifest](evidence/phase4-verification.json), [unit results](evidence/phase4-unit-results.json), [HTTP responses](evidence/phase4-http-responses.txt), [reviewer walkthrough](UAT-AND-DEMO.md), [production blockers](AWS-PRODUCTION-READINESS.md). Subsequent lint/link/privacy checks and immutable source hashes are recorded separately. No new cloud deployment or plan upgrade occurred. Owner UAT acceptance remains pending.

## Subsequent AWS observability and resilience

The next local iteration has 45 unit/application tests: six new observability/adapter cases and six SDK cancellation fault cases. [Current commands](evidence/aws-readiness-2-verification.json), [unit results](evidence/aws-readiness-2-unit-results.json), [actual HTTP responses](evidence/aws-readiness-2-http-responses.txt). Each [memory](evidence/aws-readiness-2-resilience-memory.json) and [DynamoDB Local](evidence/aws-readiness-2-resilience-dynamodb-local.json) exercise records 76 actual service invocations, five scenarios and observed local durations. SDK fault tests use a stubbed send boundary; repository faults are injected around actual local persistence. Neither is a live AWS fault or backoff measurement. [Operational scope](AWS-LOCAL-OPERATIONS.md). Earlier 25/33-test runs remain dated history; Azure cloud remains NOT VERIFIED and no new cloud deployment is claimed.

## Subsequent AWS artifact and identifier iteration

The suite now has 65 unit/application cases: ten identifier cases, three reconciliation compatibility cases and seven integrity/journal cases added to the prior 45. Three persistence integrations also exercise UUID durability alongside existing legacy/provenance/replay checks. [Actual commands](evidence/aws-readiness-3-verification.json), [unit case projection](evidence/aws-readiness-3-unit-results.json), [packaged smoke](evidence/aws-readiness-3-release-rehearsal.json), [SQL](evidence/aws-readiness-3-sql.txt), [rule-2 host](evidence/aws-readiness-3-azure-host.json), [GCP container](evidence/aws-readiness-3-gcp-container.json). Initial failures are preserved separately. No cloud verification of these changes is claimed; [scope and next gates](AWS-LOCAL-RELEASE-AND-IDENTIFIERS.md).
