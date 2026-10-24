# GCP actual deployment, business tests and teardown

All demonstration data is synthetic. Portfolio project, not an employer integration.

**Business APIs: CLOUD VERIFIED AND REMOVED. Deployed health route: FAILED. Corrected health route: LOCAL PASS, NOT REDEPLOYED.** This is a completed temporary lab, not an ongoing hosted service or a claim that every check passed.

The owner approved the exact trial-only setup, deployment, bounded tests and same-session teardown. One new isolated project was linked to the reviewed trial billing account. Target London quota, location, billing and empty-inventory checks passed before creating app resources. A transient registry permission denial resolved on a read-only retry without an additional role grant.

## Exact deployed artefact and configuration

- Source: `5e709d648fc2ef0bc68eeb7258d1fd9a9741905c`.
- Region: `europe-west2`; revision: `serviceflow-insights-00001-62l`.
- Image digest: `sha256:73efb0a5dd4600d85f63237d2133e353ade0b08812b59225ac028fd5913010ff`.
- One logical image push contained an OCI index, runtime manifest and BuildKit provenance manifest. The registry reported 99,534,498 bytes across sized descriptors; index overhead is not represented as a separately measured storage bill. This remained below the 1 GiB planning allowance.
- Actual inspected limits: 1 vCPU, 256 MiB, request-based CPU billing, startup boost off, minimum zero/maximum one at service and revision levels, concurrency 10, timeout 15 seconds.
- Invoker IAM remained enabled with no anonymous binding. Runtime project IAM showed only `roles/datastore.viewer`; final service invocation policy contained only the approved caller. The owner was an administrator and exercised multiple test identities; this is not independent human segregation of duties.
- Firestore was a free-tier-eligible `(default)` Standard Native database in London, with PITR/deletion protection disabled. A separate seeder created one bounded fictional snapshot, read it back exactly and had its data role removed. No credential key files, remote build, paid scanning, VPC connector or paid-plan upgrade were used.

[Actual public-safe projection](evidence/gcp-cloud-verification.json), [pre-upload test of the deployed image](evidence/gcp-deployed-image-local-test.json), [reviewed cost scenario](evidence/gcp-retail-cost-scenario.json). Raw identifiers, principal emails, endpoint URLs and tokens are excluded from the public portfolio.

## Live acceptance results

| Check                                                                     | Actual result                                                                                                                                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous request                                                         | Cloud Run IAM 403                                                                                                                                               |
| Forged platform token                                                     | IAM 401                                                                                                                                                         |
| Valid platform caller with missing/forged app token                       | App 403 with Forbidden response                                                                                                                                 |
| Valid platform caller with separately signed non-allowlisted app identity | App 403 with Forbidden response                                                                                                                                 |
| KPI response                                                              | 200; 48 records, one unidentifiable; quality 41/47, readiness 13/20, overdue 9/20, on-time 0/7, findings 12 (8 critical/4 review)                               |
| Filtered findings/pagination                                              | 200; critical total 8 with page of 3; review total 4                                                                                                            |
| Duplicate versus legitimate pending approval                              | Duplicate unassessable; valid pending approval quality PASS/readiness BLOCKED                                                                                   |
| Invalid date/severity                                                     | 400                                                                                                                                                             |
| Unsupported POST mutation route                                           | 404                                                                                                                                                             |
| Independent final snapshot check                                          | Source hash and update timestamp unchanged                                                                                                                      |
| Logs and final IAM                                                        | Bounded read returned 31 entries, including six structured request records with correlation IDs; runtime viewer-only and final caller-only policy checks passed |

There were **28 application HTTP attempts in total**, including failed health probes and permission diagnostics. This does not mean 28 passing tests. Twenty-two attempts used paths that could load a document, plus two direct document readbacks; many attempts were denied or rejected before loading data. One seed create and one cleanup delete were issued. These are conservative explicit request counts, not measured provider billed-read totals or SDK retry telemetry.

The temporary seeder invoker grant test continued to return a platform 403 rather than an app response, so it did **not** prove app allowlist rejection. Its grant was revoked. The separate dual-header test used an authorised platform caller and a valid non-allowlisted app token to verify that app boundary. The failed diagnostic remains in the evidence.

## Health failure and local correction

The deployed `/healthz` path returned Google's HTML 404 from both provider URLs, with no corresponding service request logs. The normal authenticated KPI route returned 200. This is consistent with Google's [reserved-path warning](https://docs.cloud.google.com/run/docs/known-issues), which recommends avoiding paths ending in z; no provider-wide outage is claimed.

The application, Docker healthcheck and HTTP/container smoke scripts now use `/health`. Tests verify anonymous denial and authenticated liveness even when the data provider fails. Lint, strict typecheck, 25 unit/application tests, all three builds and authorised loopback HTTP smoke passed. A first post-build container run timed out; the same corrected image passed on retry at the 256 MiB limit, including authenticated health and exact emulator-backed KPIs. The test container/document were removed and the emulator stopped.

**The corrected image was not uploaded or redeployed.** Its local image identity differs from the deployed digest. [Local correction checks](evidence/gcp-health-fix-checks.json), [container result](evidence/gcp-health-fix-container.json), [HTTP result](evidence/gcp-health-fix-http.txt). Another cloud deployment requires explicit approval.

## Teardown and cost observation

| Event on 24 October 2026                  | UTC      | Europe/London |
| ----------------------------------------- | -------- | ------------- |
| Bootstrap began                           | 16:30:42 | 17:30:42      |
| Service deployed                          | 16:44:59 | 17:44:59      |
| Business smoke passed                     | 16:57:04 | 17:57:04      |
| Four active-resource absence lists passed | 17:04:17 | 18:04:17      |
| New project confirmed DELETE_REQUESTED    | 17:04:23 | 18:04:23      |

The service/revisions, fixture/database, repository/image, dedicated data/impersonation grants and three service accounts were removed. Database deletion completed asynchronously; a repository delete initially rejected an unsupported query parameter, then the documented endpoint succeeded. Four independent lists confirmed no active lab service, database, repository or dedicated accounts. The newly created project entered `DELETE_REQUESTED` after **33.68 minutes**, within the one-hour target. Recovery and provider log-retention periods still apply; permanent erasure is not claimed. The pre-existing project and trial account were preserved.

The final read-only console refresh still explicitly showed Free trial account, with available trial credit and dates checked privately. Current-month cost displayed zero, subject to billing delay. No exact credit consumption, final bill or commercial saving is inferred. The £0.10559 gross cost scenario was a model before allowances/credit, not actual spend.

## Reproduction boundary

The local scripts, fixtures, SQL reference, tests, Dockerfile and Cloud Run manifest are in this repository. The approved operator used workspace-local gcloud, short-lived impersonation tokens, a private rendered manifest, create-only typed Firestore REST seeding, dual authentication headers and provider GET/list checks. Raw operational responses remain private. A reviewer can reproduce local checks without cloud credentials; repeating cloud provisioning requires a fresh cost review and owner approval. GitHub publication/remote CI are separate evidence gates.
