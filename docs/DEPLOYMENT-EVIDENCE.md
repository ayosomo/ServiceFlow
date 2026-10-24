# Deployment evidence register

All demonstration data is synthetic. Portfolio project, not an employer integration.

Current release/source is distinct from the exact historical deployed commits below. No cloud resource was created by the Phase 4/local hardening work. Existing Free plans/trials were not upgraded; any new deployment requires a fresh reviewed proposal and explicit owner approval.

| Lab   | LOCAL PASS                                                 | CLOUD DEPLOYED           | CLOUD VERIFIED                                                            | PUBLIC CASE STUDY REVIEWED                            |
| ----- | ---------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| AWS   | Yes; BA-007/008 extension local-only                       | Historical demo; removed | Original feature set verified; new controls NOT cloud verified            | Agent editorial/link review; owner acceptance pending |
| Azure | Yes; real local Functions host + Azurite and exact package | No                       | **NOT VERIFIED**                                                          | Agent editorial/link review; owner acceptance pending |
| GCP   | Yes; health correction passes locally                      | Historical demo; removed | Business APIs verified; deployed health failed; correction not redeployed | Agent editorial/link review; owner acceptance pending |

## AWS historical approved run

Deployed source `e0a49b611d654728a72611ee1a5e7eb571ce4adf`, eu-north-1. Stack CREATE_COMPLETE at 14:12:27 UTC on 24 October 2026. Fifteen actual HTTP calls, including ten mutation attempts, passed within the approved scope. Direct DynamoDB reads verified the approved version, two audit events and two receipts. Unsigned and signed reader-only mutations were denied. Regional structured logs and seven-day retention passed.

Dedicated resources were removed at 14:14:18 UTC; seven independent absence checks passed at 14:14:47 UTC. Free plan remained active; delayed/final billing remains unverified. One owner exercised all roles; independent human approval/effective least privilege were not established. [Exact provider/test projection](evidence/aws-cloud-verification.json). New local self-decision/provenance controls are excluded from this historical claim.

## Azure local-only and account review

No application/storage deployment exists. The exact reproducible ZIP ran in a local Functions v4/Node 22 host with Azurite. Private package/managed-identity templates compile locally; live identity/package fetch and storage-trigger behaviour remain unverified. [Package evidence](evidence/azure-package-host.json), [storage/runbook](AZURE-PACKAGE-AND-STORAGE.md).

Read-only review confirms Enabled Free Trial and spending limit On. Current credit balance/direct expiry are now verified privately; ActualCost returns no rows, not measured final zero spend. Ten checked regions establish no usable Y1 allocation. Only the earlier explicitly approved Microsoft.Web registration changed subscription setup. [Latest redacted account evidence](evidence/azure-free-recheck.json), [no-upgrade owner route](AZURE-NO-UPGRADE-OPTIONS.md). Deployment stays NOT APPROVED/NOT VERIFIED; no paid conversion is authorised.

## GCP historical approved run

Deployed source `5e709d648fc2ef0bc68eeb7258d1fd9a9741905c`, London, one image/revision and one synthetic snapshot. Actual business KPI/auth/filter/insight tests passed and the snapshot stayed unchanged. Twenty-eight HTTP attempts include failed diagnostics, not 28 passed assertions. Deployed `/healthz` failed at the provider; `/health` is a later local-only correction.

Four independent active-resource absence checks passed at 17:04:17 UTC on 24 October 2026; project DELETE_REQUESTED confirmed at 17:04:23 UTC, 33.68 minutes after bootstrap began. Recovery/log-retention rules still apply; permanent erasure is not claimed. Final console refresh retained Free Trial; credit/dates are private and delayed final billing is unverified. [Actual results](GCP-CLOUD-RESULTS.md), [revision/digest/test/cleanup projection](evidence/gcp-cloud-verification.json). No live lab endpoint remains and no redeploy is authorised.

## New local evidence and future run record

[Phase 4/local hardening commands](evidence/phase4-verification.json), [screenshot provenance](evidence/SCREENSHOTS.md), [owner UAT record](UAT-AND-DEMO.md), [production backlog](AWS-PRODUCTION-READINESS.md).

For any approved future run record: approval reference, fresh account/plan/cost/region/quotas, exact source and IaC/build hashes, command exits, resource/revision list and timestamps, positive and negative authenticated HTTP behaviour, independent persisted-state checks, redacted log correlations, teardown/absence and delayed billing review. Keep account/principal identifiers, balances and credentials private. Local tests or published source alone do not prove cloud verification.
