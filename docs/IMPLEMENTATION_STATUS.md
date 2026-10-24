# Implementation status

Independent portfolio by Olukoyede Osomo. All demonstration data is synthetic. Portfolio project, not an employer integration.

Current review: 24 October 2026 (Europe/London). Source, local execution, historical cloud verification and owner acceptance are separate states. Exact command evidence takes precedence over a narrative summary.

## Current stage gates

| Gate | Scope                                                                      | State                                                                                                                                            |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| G0   | BA definition, schema, acceptance and traceability                         | Implemented; owner review available                                                                                                              |
| G1   | Deterministic 48 fixtures/eight affected rows, Docker/PostgreSQL reference | LOCAL PASS                                                                                                                                       |
| G2   | AWS request/decision/auth/audit                                            | Historical cloud demo VERIFIED and removed; new BA-007/008 controls local-only                                                                   |
| G3   | Azure reconciliation                                                       | LOCAL PASS including exact ZIP in actual local Functions host/Azurite; cloud NOT VERIFIED                                                        |
| G4   | GCP insights                                                               | Historical cloud business APIs VERIFIED and removed; deployed health failed; correction local-only                                               |
| G5   | Public portfolio                                                           | README/three case studies, evidence/provenance and agent editorial review supplied; owner UAT/acceptance pending; publication/CI tracked per SHA |

## Local implementation and execution

The initial completed baseline passed 25 unit/application tests, three persistence integrations, Docker PostgreSQL migrations/constraints/reference/EXPLAIN, actual Functions v4 Blob-trigger host and a non-root GCP container backed by Firestore emulator. SAM/Bicep validation and exact Azure package checks are saved separately. A clean clone of baseline source `3169f071e60ede4f4ccbe71e663db2583f896e8c` passed install/lint/typecheck/test/build. [Original evidence index](07-TRACEABILITY-AND-TEST-EVIDENCE.md), [clean clone](evidence/clean-clone.txt).

The later local AWS extension adds eight acceptance/failure cases for 33 unit/application tests: dual-role own-decision denial, fail-closed submission provenance and safe retries after uncertain commits. Actual local HTTP uses distinct synthetic requester/approver tokens. DynamoDB Local persists a transaction before an injected lost acknowledgement and verifies one recoverable decision/audit. These controls were not in the earlier deployed source. [Current command manifest](evidence/phase4-verification.json), [backlog and release blockers](AWS-PRODUCTION-READINESS.md).

CI runs quality, bounded secret and portfolio-link checks without cloud deployment credentials or deployment jobs. A passing earlier SHA is not evidence for a later commit. [Historical publication](evidence/github-publication.json), [live workflows](https://github.com/ayosomo/ServiceFlow/actions).

## Current cloud/cost boundaries

- AWS: approved eu-north-1 run had 15 HTTP calls, direct DynamoDB audit/receipt checks, regional logs and seven independent teardown checks. Free plan remained active. Managed project grants and one owner exercising roles prevent effective least-privilege/independent-human claims. Delayed final billing remains unverified.
- Azure: account browser/CLI access, Enabled FreeTrial and spending limit On verified. Approved Microsoft.Web registration enabled usage reads. Later summary/lots HTTP 200 resolves credit visibility; balance/direct expiry stay private. Cost query has no rows; final billing is unverified. Six checked regions explicitly return Y1 0/0; four omit it. No usable allocation, application/storage resources or deployment approval. Included portal billing/subscription-support draft remains unsent; no paid upgrade.
- GCP: approved London run verified business APIs/auth/KPIs, removed active lab resources and requested project deletion. `/healthz` provider 404 is preserved; `/health` fix passed locally without redeployment. Final read-only credit refresh retained Free Trial; delayed final billing and permanent erasure are unverified.

[Authoritative deployment register](DEPLOYMENT-EVIDENCE.md), [cost gate](COST_GATE.md). No new cloud deployment, plan conversion, budget/notification or support submission occurred during Phase 4.

## Decisions, failures and review

Code was implemented in brief order: shared baseline, AWS, Azure, GCP. Snapshot is `2026-10-23T00:00:00.000Z`; active means SUBMITTED/APPROVED/IN_PROGRESS, missing denominators yield null. Quality, readiness and delivery risk are distinct. Fixture raw sources were never repaired to make tests pass.

Docker initially failed because a frozen WSL VM held its disk; an owner-approved Windows restart restored it without intentionally deleting existing data. A mistaken findings-count expectation was corrected to twelve after inspecting overlapping rules. Actual local host testing found the .NET/Node emulator-port mismatch. The GCP provider health failure led to a local-only path correction; initial local startup/container failures are retained. Earlier Windows screenshot helper approval timed out; later browser-rendered saved-evidence images do not pretend to be original console captures.

Public documentation includes no real employer/customer data. Owner supplied `ayosomo/ServiceFlow`; ownership/write access were verified before publication, and original history preserved. Trackvera was not modified. Private Notion root and all seven evidence/learning subpages were created/read back; identifiers and financial details remain outside public Git.

## Remaining work

Owner UAT/case-study acceptance; Microsoft's no-upgrade Azure Y1 clarification; delayed/final billing review; separately approved cloud verification of new AWS controls and GCP health correction if desired; production identity/permissions, service targets, recovery/retention and operational ownership in the backlog. No production availability, security certification, UI accessibility, performance at scale or business saving is claimed. The optional public product/case-study app is not required: the GitHub README is the portfolio index.
