# Implementation status

Independent portfolio by Olukoyede Osomo. All demonstration data is synthetic. Portfolio project, not an employer integration.

Evidence date: 24 October 2026 (Europe/London). Local runtime and persistence checks below have been executed; cloud status is independent.

## Checked starting facts

- Handoff read completely; archive contains briefing Markdown only, no starter application.
- Initial workspace had no Git repository or remote. A dedicated local ServiceFlow repository has now been initialised; no remote has been created. Trackvera has not been opened or modified.
- Node v24.21.0; pnpm 11.25.0; Docker CLI 29.9.1; Compose v5.6.0; Git 2.41.0.windows.1.
- AWS CLI, Azure CLI, Functions Core Tools, gcloud and GitHub CLI absent from PATH at inspection. Workspace-local SAM 1.170.0 and Bicep 0.48.1 were subsequently installed and validated. Functions v4 and gcloud/Firestore run inside local Docker images.
- GitHub connector identity verified as `ayosomo`; no GitHub repository has been created or pushed.
- Private Notion root authorised by owner in chat; created as ServiceFlow Cloud Labs — BA & Cloud Evidence.
- Docker's frozen WSL VM was recovered through an owner-approved Windows restart. Docker Desktop 4.96.3 / Engine 29.9.2 returned a real Server response and executed hello-world. Existing Docker data was preserved.
- Docker PostgreSQL 16 migrations, seeding, constraints, latest-history selection, independent KPI comparison and EXPLAIN passed. Native PostgreSQL 18.4 fallback also passed before the Docker recovery.
- 25 unit/application tests and 3 Docker persistence integration tests passed (DynamoDB, Azurite, Firestore). Actual Functions v4 Blob-trigger host smoke passed. Non-root GCP container HTTP -> Firestore emulator -> exact KPI response passed, with anonymous/invalid-token 403.
- `sam validate --lint`, prebuilt-bundle `sam build`, and Bicep compilation passed locally. Cloud IAM, managed identity, real provider availability and billing remain unverified.
- No AWS config/profile/credentials file, AWS credential environment variable or AWS CLI was present during the access check. Account access and billing still require setup/review.
- Cloud account age, billing state, credits, region eligibility and spend protections UNKNOWN. No provider resources created. Explicit deployment approval absent.

## Assumptions and scope decisions

The owner approved implementing the supplied requirements. G0 means this baseline exists under that brief; it is not a claim of a separate stakeholder workshop. CRM owns planned target, supplier disagreement is REVIEW. Source matching is optional, so unmatched supplier references are REVIEW. Active means SUBMITTED, APPROVED or IN_PROGRESS. Snapshot is 2026-10-23T00:00:00.000Z. REJECTED and DRAFT are excluded from active delivery KPIs. All ratios use null for an empty denominator.

Code is implemented in phase order: shared baseline, AWS, Azure, GCP. Cloud progression is conditional: absent access/approval means continue local work and mark live deployment NOT VERIFIED, as expressly allowed by the handoff. AWS is first for any future real deployment.

## Gates

| Gate | Meaning                                        | Current state                                                                       |
| ---- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| G0   | BA baseline and acceptance definitions         | Implemented; owner review available                                                 |
| G1   | Fixtures, SQL, Docker runtime                  | LOCAL PASS                                                                          |
| G2   | AWS local and real cloud smoke                 | LOCAL PASS including DynamoDB transactions and SAM; cloud NOT VERIFIED              |
| G3   | Azure local and real storage trigger           | LOCAL PASS including actual Functions host + Azurite; cloud NOT VERIFIED            |
| G4   | GCP local/container and real private Cloud Run | LOCAL PASS including container + Firestore emulator; cloud NOT VERIFIED             |
| G5   | Reviewed public portfolio and screenshots      | Case study prepared; GitHub publication/CI, owner review and UI screenshots pending |

## Evidence and remaining work

The executable results are indexed in [test evidence](07-TRACEABILITY-AND-TEST-EVIDENCE.md). Final lint/typecheck/unit/build/HTTP status is recorded per command in docs/evidence/verification.json; do not infer a pass solely from this narrative.

Runtime dependency audit has zero high/critical and one moderate uuid advisory through the stable Azure identity/MSAL chain. The earlier high-severity MSAL advisory was avoided by selecting a compatible stable identity dependency. No claim of zero vulnerabilities is made. CI enforces the high threshold. Review the moderate advisory again before deployment.

The Windows screenshot helper timed out waiting for app approval; no screenshot has been fabricated or labelled as captured. Reproducible CLI logs, JSON outputs and actual container/host tests are supplied. No browser UI or accessibility audit is claimed.

Pending external gates: account login and actual eligibility/billing checks; explicit approval of each concrete resource plan; real provider smoke/IAM denial/cost/teardown evidence; public repository publication and actual GitHub CI/CodeQL runs. AWS remains first for any real deployment.
