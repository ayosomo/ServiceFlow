# Test evidence and reproducibility

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

| Executed check                                                 | Result                      | Saved evidence                                                                                                |
| -------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 25 unit/application tests                                      | PASS                        | [test.txt](evidence/test.txt)                                                                                 |
| DynamoDB/Azurite/Firestore persistence integrations            | 3 PASS                      | [integration-all.txt](evidence/integration-all.txt)                                                           |
| PostgreSQL Docker reference, PK/FK/chronology, latest update   | PASS                        | [db-test-docker.txt](evidence/db-test-docker.txt)                                                             |
| Actual SQL plan                                                | Captured; tiny dataset only | [db-explain-docker.txt](evidence/db-explain-docker.txt)                                                       |
| Functions v4 trigger -> Blob report                            | PASS                        | [azure-functions-host.json](evidence/azure-functions-host.json)                                               |
| Non-root container -> Firestore emulator -> HTTP KPIs          | PASS                        | [gcp-container.json](evidence/gcp-container.json)                                                             |
| Local AWS intake/decision/replay/409/audit + compiled GCP HTTP | PASS                        | [http-local-smoke.txt](evidence/http-local-smoke.txt)                                                         |
| SAM validation/package and Azure Bicep compilation             | PASS locally                | [SAM](evidence/sam-validate.txt), [build](evidence/sam-build.txt), [Bicep](evidence/infrastructure-local.txt) |
| Runtime advisory check                                         | 0 high/critical; 1 moderate | [audit](evidence/dependency-audit.json)                                                                       |

Actual Azure host testing exposed a .NET/Node difference in DevelopmentStorageProxyUri parsing: the trigger reached port 10000 while Node tried port 80. An allowlisted, explicit local Blob endpoint fixed the integration; the cloud path still uses managed identity. The failed batch reached the local poison queue and did not produce a false PASS. The successful fresh batch is recorded separately. Lint also exposed generated scratch bundles being scanned; scratch is now excluded while source lint remains enabled.

PostgreSQL's canonical overdue EXPLAIN returns 13 rows from the 48 valid canonical fixtures; the dirty-source KPI returns 9 from 20 eligible active rows. These are deliberately different universes. The plan illustrates index access and buffer activity; its timings under local container/build load do not prove production performance.

No fabricated screenshot is supplied. UI capture remains pending because the Windows app approval timed out. CLI/JSON execution evidence is available above. No browser UI is implemented; no Playwright or accessibility claim is made.
