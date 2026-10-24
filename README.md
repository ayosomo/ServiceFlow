# ServiceFlow Cloud Labs

Independent Business Analysis and TypeScript portfolio by **Olukoyede Osomo**.

**All demonstration data is synthetic. Portfolio project, not an employer integration.**

Three small applications address one fictional service-delivery problem: incomplete requests, conflicting operational data and unclear performance reporting. BA requirements and acceptance tests connect the business question to actual implementation evidence. **AWS was deployed, tested and torn down on 24 October 2026.** **GCP business APIs were deployed, tested and torn down on the same date; its deployed `/healthz` route failed and the `/health` correction is local-only.** Azure live deployment remains **NOT VERIFIED**.

| Lab                                                           | Implemented feature                                                    | Local evidence                                          | Cloud                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| [AWS request approval](apps/aws-request-approvals/README.md)  | Validated intake, versioned decision, atomic audit/idempotency adapter | [tests](apps/aws-request-approvals/tests/api.test.ts)   | VERIFIED; torn down                           |
| [Azure reconciliation](apps/azure-data-quality/README.md)     | Preserved CSVs, rule-level findings, retry-safe result commit          | [tests](apps/azure-data-quality/tests/pipeline.test.ts) | NOT VERIFIED                                  |
| [GCP delivery insights](apps/gcp-delivery-insights/README.md) | Defined KPIs, findings and rule-backed drill-down                      | [tests](apps/gcp-delivery-insights/tests/api.test.ts)   | BUSINESS API VERIFIED; removed; health caveat |
| PostgreSQL reference                                          | Constraints, joins, latest-source window, filtered KPIs and EXPLAIN    | [SQL runner](db/run.ts)                                 | Local only by design                          |

See [implementation status](docs/IMPLEMENTATION_STATUS.md) for exact passed/pending checks. A source test link alone does not imply that a provider integration passed.

The [Definition of Done audit](docs/DEFINITION-OF-DONE.md) maps all eleven quality gates to per-lab evidence. Azure provisioning remains on hold and cloud NOT VERIFIED; the local unsigned-write check proves Azurite rejection only.

## Reproduce locally

Use Node 22 LTS (local authoring used recorded Node 24), pnpm 11.25.0 and a running Docker engine.

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

If Docker cannot start, `pnpm db:portable` runs native PostgreSQL independently and stops it afterwards; `pnpm azure:emulator` runs a native Azurite adapter test. Both are explicitly different from container/Functions-host verification. These commands use ignored work/ by default; LAB_WORK_DIR can select another local scratch directory. Do not run portable PostgreSQL on the same port as Compose PostgreSQL.

For local HTTP demos generate random LOCAL_API_TOKEN and, for AWS, a distinct LOCAL_APPROVER_TOKEN, each at least 24 characters. Run `pnpm aws:local` (3101) or `pnpm gcp:local` (8080). AWS maps the first token to the synthetic requester and the second to the approver. Send tokens only to loopback as Bearer credentials; do not save them to Git/evidence. `pnpm test:http` generates both temporarily and exercises the complete local workflow. The demos use in-memory/fixture adapters. See each app README for provider-specific persistence and auth boundaries.

The [data dictionary](docs/03-DATA-DICTIONARY.md) explains 48 requests, eight intentionally affected CRM rows, and 12 findings. The immutable snapshot is 23 October 2026 UTC. Quality, readiness and delivery risk are separate measures. Source CSVs/JSON are preserved alongside canonical fiction; reports never repair bad inputs silently.

## Review the BA and engineering decisions

- [Problem, personas and AS-IS/TO-BE](docs/00-PROBLEM-AND-PERSONAS.md)
- [Requirement-to-test matrix](docs/01-REQUIREMENTS-MATRIX.md) and [Given/When/Then UAT](docs/02-USER-STORIES-AND-ACCEPTANCE.md)
- [Architecture, approval sequence, Azure flow and state machine](docs/04-ARCHITECTURE.md)
- [Threat model](docs/05-THREAT-MODEL.md), [metric definitions](docs/06-KPI-CATALOGUE.md) and [PostgreSQL vs NoSQL ADR](docs/ADR-001-RELATIONAL-VS-DOCUMENT.md)
- [Execution evidence](docs/07-TRACEABILITY-AND-TEST-EVIDENCE.md), [cost gate](docs/COST_GATE.md), [deployment register](docs/DEPLOYMENT-EVIDENCE.md)
- Case studies: [AWS](docs/case-studies/AWS.md), [Azure — local only](docs/case-studies/AZURE.md), [GCP — health caveat](docs/case-studies/GCP.md)
- [Reviewer UAT/demo](docs/UAT-AND-DEMO.md), [Phase 4 review and status matrix](docs/PHASE-4-PORTFOLIO-REVIEW.md), [visual evidence/provenance](docs/evidence/SCREENSHOTS.md)
- [Interview explanations](docs/INTERVIEW-EXPLANATIONS.md), [CV claim ledger](docs/CV-CLAIMS.md), [AWS production-readiness backlog](docs/AWS-PRODUCTION-READINESS.md)

The original local baseline passed 25 unit/application tests, three persistence integrations, Docker PostgreSQL SQL checks, an actual Azure Functions host trigger, and a non-root GCP container backed by the Firestore emulator. Phase 4 added eight cases for 33 tests. The subsequent local operations/resilience iteration added twelve cases for **45 unit/application tests**; [current command evidence](docs/evidence/aws-readiness-2-verification.json) and the [local operations contract](docs/AWS-LOCAL-OPERATIONS.md) record the boundaries. Historical [Phase 4 evidence](docs/evidence/phase4-verification.json) remains separate. SAM and Bicep validation are recorded separately. The new AWS principal/provenance, metrics/correlation and SDK cancellation controls have not been cloud deployed.

No product web UI, accessibility audit, commercial time saving or production-scale benchmark is claimed. The 48-record EXPLAIN evidence illustrates query behaviour, not scalability. Browser screenshots display saved actual evidence and include source hashes; they are not cloud-console captures. Agent editorial review and owner acceptance are tracked separately. GitHub Actions quality checks and CodeQL passed for published implementation commit `56e708e`; later runs apply only to their own SHA. Neither workflow deploys cloud resources. See [historical publication evidence](docs/evidence/github-publication.json) and [live workflows](https://github.com/ayosomo/ServiceFlow/actions).

## Next review gates

AWS passed 15 real HTTP calls, including unsigned and signed wrong-role 403s, with independent DynamoDB request/audit/receipt checks and regional logs. All dedicated resources were independently verified removed. See [cloud evidence](docs/evidence/aws-cloud-verification.json). The Free plan remained active; delayed/final billing is not yet independently verified. One owner exercised all application roles, so no separation-of-duties or effective least-privilege claim is made.

Azure account checks confirm an enabled Free Trial and spending limit On; remaining credit balance and expiry are privately verified. The cost query returns no rows rather than measured final billing. UK South Y1 limit is zero; no usable allocation was verified across ten checked regions. Storage/package configuration is complete locally, with an exact-ZIP host smoke; deployment remains blocked. See [account review](docs/AZURE-SUBSCRIPTION-REVIEW.md). Google Cloud completed its approved temporary business API run; its corrected health route remains local-only. Another cloud run requires explicit approval. The portfolio uses saved, labelled evidence; owner case-study/UAT acceptance remains pending. Private backends need not remain online.

## Current local release and identifier iteration

The current suite has **65 unit/application tests**, plus three persistence integrations. Added UUID v4 generation while preserving legacy IDs across APIs, PostgreSQL, CSV reconciliation and KPIs. Added digest-verified Lambda packaging, actual packaged smoke and a local promotion/rollback journal. Rule-version-2 summaries preserve older results by rejecting mismatched replay. [Current command evidence](docs/evidence/aws-readiness-3-verification.json), [compatibility, reproduction and remaining production gates](docs/AWS-LOCAL-RELEASE-AND-IDENTIFIERS.md).

These changes remain local-only. AWS-P08 is partial; consumer acceptance, protected environments, trusted provenance, cloud rollback, identity/operations and production approval remain open. The older exact Azure ZIP describes earlier code; current rule-2 host evidence is local and Azure cloud remains NOT VERIFIED. No Free plan change or cloud redeployment was made.
