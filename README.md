# ServiceFlow Cloud Labs

Independent Business Analysis and TypeScript portfolio by **Olukoyede Osomo**.

**All demonstration data is synthetic. Portfolio project, not an employer integration.**

Three small applications address one fictional service-delivery problem: incomplete requests, conflicting operational data and unclear performance reporting. BA requirements and acceptance tests connect the business question to actual implementation evidence. **AWS was deployed, tested and torn down on 24 October 2026.** Azure and Google Cloud live deployments remain **NOT VERIFIED**.

| Lab                                                           | Implemented feature                                                    | Local evidence                                          | Cloud                |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| [AWS request approval](apps/aws-request-approvals/README.md)  | Validated intake, versioned decision, atomic audit/idempotency adapter | [tests](apps/aws-request-approvals/tests/api.test.ts)   | VERIFIED; torn down  |
| [Azure reconciliation](apps/azure-data-quality/README.md)     | Preserved CSVs, rule-level findings, retry-safe result commit          | [tests](apps/azure-data-quality/tests/pipeline.test.ts) | NOT VERIFIED         |
| [GCP delivery insights](apps/gcp-delivery-insights/README.md) | Defined KPIs, findings and rule-backed drill-down                      | [tests](apps/gcp-delivery-insights/tests/api.test.ts)   | NOT VERIFIED         |
| PostgreSQL reference                                          | Constraints, joins, latest-source window, filtered KPIs and EXPLAIN    | [SQL runner](db/run.ts)                                 | Local only by design |

See [implementation status](docs/IMPLEMENTATION_STATUS.md) for exact passed/pending checks. A source test link alone does not imply that a provider integration passed.

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

For local HTTP demos generate a random LOCAL_API_TOKEN of at least 24 characters in the shell, then run `pnpm aws:local` (3101) or `pnpm gcp:local` (8080). Send it only to loopback as a Bearer token; do not save it to Git/evidence. The demos use in-memory/fixture adapters. See each app README for provider-specific persistence and auth boundaries.

The [data dictionary](docs/03-DATA-DICTIONARY.md) explains 48 requests, eight intentionally affected CRM rows, and 12 findings. The immutable snapshot is 23 October 2026 UTC. Quality, readiness and delivery risk are separate measures. Source CSVs/JSON are preserved alongside canonical fiction; reports never repair bad inputs silently.

## Review the BA and engineering decisions

- [Problem, personas and AS-IS/TO-BE](docs/00-PROBLEM-AND-PERSONAS.md)
- [Requirement-to-test matrix](docs/01-REQUIREMENTS-MATRIX.md) and [Given/When/Then UAT](docs/02-USER-STORIES-AND-ACCEPTANCE.md)
- [Architecture, approval sequence, Azure flow and state machine](docs/04-ARCHITECTURE.md)
- [Threat model](docs/05-THREAT-MODEL.md), [metric definitions](docs/06-KPI-CATALOGUE.md) and [PostgreSQL vs NoSQL ADR](docs/ADR-001-RELATIONAL-VS-DOCUMENT.md)
- [Execution evidence](docs/07-TRACEABILITY-AND-TEST-EVIDENCE.md), [cost gate](docs/COST_GATE.md), [deployment register](docs/DEPLOYMENT-EVIDENCE.md)
- [Case studies](docs/CASE-STUDIES.md), [interview explanations](docs/INTERVIEW-EXPLANATIONS.md), [CV claim ledger](docs/CV-CLAIMS.md)

Verified local evidence includes 25 unit/application tests, three persistence integrations, Docker PostgreSQL SQL checks, an actual Azure Functions host trigger, and a non-root GCP container backed by the Firestore emulator. SAM and Bicep validate locally. See the saved command logs for the exact boundaries.

No web UI, accessibility audit, commercial time saving or production-scale benchmark is claimed. The 48-record EXPLAIN evidence illustrates query behaviour, not scalability. Cloud deployment, UI screenshots and public case-study review are tracked separately. GitHub Actions and CodeQL workflows are supplied but have not run on GitHub; neither deploys cloud resources.

## Next review gates

AWS passed 15 real HTTP calls, including unsigned and signed wrong-role 403s, with independent DynamoDB request/audit/receipt checks and regional logs. All dedicated resources were independently verified removed. See [cloud evidence](docs/evidence/aws-cloud-verification.json). The Free plan remained active; delayed/final billing is not yet independently verified. One owner exercised all application roles, so no separation-of-duties or effective least-privilege claim is made.

Azure initial account checks confirm an enabled Free Trial and spending limit On; credit balance/expiry and actual costs remain unavailable. Approved Microsoft.Web registration enabled the quota check: UK South Y1 limit is zero. Storage/package configuration is complete locally, with an exact-ZIP host smoke; deployment remains blocked. See [account review](docs/AZURE-SUBSCRIPTION-REVIEW.md). Complete those gates and obtain separate deployment approval, then repeat for Google Cloud. Publish a reviewed README/case study and real screenshots; private backends need not remain online.
