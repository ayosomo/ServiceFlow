# Implementation status

Independent portfolio by Olukoyede Osomo. All demonstration data is synthetic. Portfolio project, not an employer integration.

Evidence date: 24 October 2026 (Europe/London). Local runtime and persistence checks below have been executed; cloud status is independent.

## Checked starting facts

- Handoff read completely; archive contains briefing Markdown only, no starter application.
- Initial workspace had no Git repository or remote. A dedicated local ServiceFlow repository has now been initialised; the owner subsequently supplied `ayosomo/ServiceFlow` for reviewed publication. Trackvera has not been opened or modified.
- Node v24.21.0; pnpm 11.25.0; Docker CLI 29.9.1; Compose v5.6.0; Git 2.41.0.windows.1.
- AWS CLI, Azure CLI, Functions Core Tools, gcloud and GitHub CLI absent from PATH at inspection. Workspace-local SAM 1.170.0 and Bicep 0.48.1 were subsequently installed and validated. Functions v4 and gcloud/Firestore run inside local Docker images.
- Azure CLI 2.91.0 was subsequently prepared from Microsoft's official Windows ZIP under workspace tooling and its version command passed. Azure browser authentication completed; read-only ARM confirms an Enabled FreeTrial subscription with spending limit On. UK South capability listings passed; after approved Microsoft.Web registration, the UK South Y1 quota is verified as current 0 / limit 0. Credit balance/expiry and month-to-date cost remain unverified. No Azure resources were deployed. See [subscription review](AZURE-SUBSCRIPTION-REVIEW.md).
- GitHub connector identity verified as `ayosomo`; the owner supplied the new, empty public `ayosomo/ServiceFlow` repository; publication is being verified separately.
- Private Notion root authorised by owner in chat; created as ServiceFlow Cloud Labs — BA & Cloud Evidence.
- Docker's frozen WSL VM was recovered through an owner-approved Windows restart. Docker Desktop 4.96.3 / Engine 29.9.2 returned a real Server response and executed hello-world. Existing Docker data was preserved.
- Docker PostgreSQL 16 migrations, seeding, constraints, latest-history selection, independent KPI comparison and EXPLAIN passed. Native PostgreSQL 18.4 fallback also passed before the Docker recovery.
- 25 unit/application tests and 3 Docker persistence integration tests passed (DynamoDB, Azurite, Firestore). Actual Functions v4 Blob-trigger host smoke passed. Non-root GCP container HTTP -> Firestore emulator -> exact KPI response passed, with anonymous/invalid-token 403.
- `sam validate --lint`, prebuilt-bundle `sam build`, and Bicep compilation passed locally. AWS real IAM route behaviour and persistence subsequently passed the approved cloud smoke; Azure managed identity and Google Cloud access remain unverified.
- Initial access check found no AWS CLI/config/profile/credentials. AWS CLI 2.38.5 was subsequently installed for the current Windows user from the verified Amazon-signed MSI. Owner approved profile `serviceflow` in eu-north-1 and completed browser authorisation. STS, Node SDK and SAM Python credential resolution passed; no credentials were printed.
- Owner explicitly approved the exact AWS deployment, bounded tests and teardown. The eu-north-1 stack reached CREATE_COMPLETE; 15 real HTTP calls and direct DynamoDB audit/receipt checks passed. Regional log creation, seven-day retention and correlation/status logs passed. All dedicated stack and packaging resources were removed, with seven independent absence checks. Free plan remained ACTIVE; budget alerts and delayed/final billing remain unverified. Account identifiers and financial balances are kept outside this repository.
- The authorised private Notion root and its seven requested evidence/learning subpages have been created and read back successfully; private links are outside this public-ready repository.

## Assumptions and scope decisions

The owner approved implementing the supplied requirements. G0 means this baseline exists under that brief; it is not a claim of a separate stakeholder workshop. CRM owns planned target, supplier disagreement is REVIEW. Source matching is optional, so unmatched supplier references are REVIEW. Active means SUBMITTED, APPROVED or IN_PROGRESS. Snapshot is 2026-10-23T00:00:00.000Z. REJECTED and DRAFT are excluded from active delivery KPIs. All ratios use null for an empty denominator.

Code was implemented in phase order: shared baseline, AWS, Azure, GCP. AWS has now completed real deployment, smoke and teardown. Azure account access and initial subscription checks passed; its credit/actual-cost and zero-quota gates remain open. Storage/package configuration is complete locally and the exact ZIP passed the Functions host smoke. Google Cloud completed its approved business API run and active-resource teardown, with the health-path exception documented below. Azure remains blocked; another GCP deployment needs fresh approval.

## Gates

| Gate | Meaning                                        | Current state                                                                                      |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| G0   | BA baseline and acceptance definitions         | Implemented; owner review available                                                                |
| G1   | Fixtures, SQL, Docker runtime                  | LOCAL PASS                                                                                         |
| G2   | AWS local and real cloud smoke                 | LOCAL PASS; CLOUD VERIFIED; dedicated resources removed                                            |
| G3   | Azure local and real storage trigger           | LOCAL PASS including actual Functions host + Azurite; cloud NOT VERIFIED                           |
| G4   | GCP local/container and real private Cloud Run | LOCAL PASS; cloud business API VERIFIED and removed; deployed health failed, correction local-only |
| G5   | Reviewed public portfolio and screenshots      | Case study prepared; GitHub publication/CI, owner review and UI screenshots pending                |

## Evidence and remaining work

The executable results are indexed in [test evidence](07-TRACEABILITY-AND-TEST-EVIDENCE.md). Final lint/typecheck/unit/build/HTTP status is recorded per command in docs/evidence/verification.json; do not infer a pass solely from this narrative.

Runtime dependency audit has zero high/critical and one moderate uuid advisory through the stable Azure identity/MSAL chain. The earlier high-severity MSAL advisory was avoided by selecting a compatible stable identity dependency. No claim of zero vulnerabilities is made. CI enforces the high threshold. Review the moderate advisory again before deployment.

The Windows screenshot helper timed out waiting for app approval; no screenshot has been fabricated or labelled as captured. Reproducible CLI logs, JSON outputs and actual container/host tests are supplied. No browser UI or accessibility audit is claimed.

AWS evidence: [actual deployment/test/teardown](evidence/aws-cloud-verification.json), deployed source commit `e0a49b611d654728a72611ee1a5e7eb571ce4adf`. Regional logging worked in the real run. Managed project IAM defaults and one owner exercising all roles prevent an effective least-privilege or independent human approval claim. The offline inventory remains configuration evidence only; the cloud JSON records actual outcomes.

Pending external gates: Azure remaining credit/actual-cost review, zero Y1 quota, live identity/package validation, observability review and separate approval; any Google Cloud health-fix redeployment needs fresh approval; their actual smoke/IAM/cost/teardown evidence; delayed AWS billing check; public repository publication, owner case-study review, screenshots and actual GitHub CI/CodeQL runs.

A fresh local clone of implemented source commit `3169f071e60ede4f4ccbe71e663db2583f896e8c` passed frozen-lockfile installation, lint, strict typecheck, all 25 unit/application tests and all three builds. See docs/evidence/clean-clone.txt. Terminal transcripts retain command/result content; only line endings and trailing whitespace were normalised for Git.

Azure no-upgrade follow-up: billing read access and Active FreeAccount initial limit/end period are verified privately; remaining credit balance is not. The latest cost query succeeds with no rows. Ten regions did not establish usable Y1 capacity. Microsoft's Free Trial quota-increase restriction leaves a private owner account/billing support handoff; no support case or upgrade was submitted. See [diagnosis](AZURE-NO-UPGRADE-OPTIONS.md). Local implementation/testing status is unchanged.

Google Cloud initial account gate: the owner opened the console, and read-only Billing Overview/Credits navigation verified a Free trial account and available promotional credit with dates (financial details retained privately). The existing Docker CLI reports Google Cloud SDK 590.0.1, without mounted credentials; no native configuration was found and no CLI authorisation is claimed. Project/resource inventory, region/quotas/IAM, complete cost review and explicit deployment approval are pending. No cloud resources were created by this review. See [console observation](evidence/gcp-account-observation.json). Cloud deployment remains NOT VERIFIED.

GCP follow-up: owner-authorised local gcloud sign-in and read-only existing-project billing/IAM/quota checks passed. London quota is nonzero; relevant resource APIs remain disabled, so inventory/region eligibility in the proposed new project is conditional. Full GBP cost scenario and exact resource/test/teardown proposal are prepared. No cloud resource/API/billing/IAM change occurred. The actual non-root container passed at the proposed 256 MiB limit; service-wide scale-one, CPU boost off and custom audience are configured and locally checked. [Proposal](GCP-DEPLOYMENT-PROPOSAL.md), [preflight](evidence/gcp-account-preflight.json), [container result](evidence/gcp-proposal-container.json). Cloud deployment remains NOT VERIFIED; approval is required before bootstrap.

GCP execution gate now has real evidence: business APIs and auth passed on Cloud Run/Firestore, active lab resources were independently removed and the new project is DELETE_REQUESTED. One documented exception remains: deployed `/healthz` returned provider 404; the `/health` correction passed local tests/container but was not redeployed. Final console refresh retained Free Trial and privately checked credit/dates. [Actual results](GCP-CLOUD-RESULTS.md). Earlier pending-account/proposal paragraphs are dated history, not the current deployment status. GitHub publication/remote CI and screenshots remain pending; the reviewed local portfolio is updated.

GCP execution now has real evidence: business APIs and auth passed on Cloud Run/Firestore, active lab resources were independently removed and the new project is DELETE_REQUESTED. One exception remains: deployed `/healthz` returned provider 404; the `/health` correction passed local tests/container but was not redeployed. Final console refresh retained Free Trial and privately checked credit/dates. [Actual results](GCP-CLOUD-RESULTS.md). Earlier pending-account/proposal paragraphs are dated history. GitHub publication/remote CI and screenshots remain pending; the reviewed local portfolio is updated.
