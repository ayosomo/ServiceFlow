# Deployment evidence register

All demonstration data is synthetic. Portfolio project, not an employer integration.

| Lab   | Cloud deployed | Cloud verified | Resource/revision/URL                        | Authorised smoke   | Anonymous rejection                                 | Cost/teardown                        |
| ----- | -------------- | -------------- | -------------------------------------------- | ------------------ | --------------------------------------------------- | ------------------------------------ |
| AWS   | YES; removed   | VERIFIED       | Recorded privately; redacted public evidence | 15 HTTP calls PASS | Unsigned and signed wrong-role 403; state unchanged | Dedicated resources verified removed |
| Azure | NO             | NOT VERIFIED   | None                                         | Not run            | Storage IAM not live-verified                       | No resources created                 |
| GCP   | NO             | NOT VERIFIED   | None                                         | Not run            | Not run against Cloud Run                           | No resources created                 |

Actual AWS evidence is in [aws-cloud-verification.json](evidence/aws-cloud-verification.json). Source commit `e0a49b611d654728a72611ee1a5e7eb571ce4adf`; eu-north-1 stack reached CREATE_COMPLETE on 24 October 2026 at 14:12:27 UTC. Fifteen HTTP calls passed, including 10 mutation attempts. Independent DynamoDB checks verified the approved version, two audit events and two receipts; regional logs and seven-day retention passed. Teardown completed at 14:14:18 UTC and seven independent absence checks passed at 14:14:47 UTC. The Free plan remained active; delayed/final billing remains unverified. Local/emulator evidence is separate. No cloud application screenshot or cost saving is claimed.

For a future deployment append: approval reference, provider/account eligibility evidence redacted for public Git, region, exact commit and IaC hash, command exit status, resource list, timestamp, runtime/build version, authenticated request/output, anonymous 401/403 plus persisted-state comparison, log correlation ID, resource deletion confirmation and billing recheck. Keep cloud-account identifiers and principal emails out of the public case study.

AWS deployment and teardown are complete. Azure browser sign-in and initial read-only subscription checks passed; its credit/actual-cost and zero-Y1-quota gates and explicit deployment approval are pending. The exact ZIP passed local host smoke; storage/package templates compile. See [account review](AZURE-SUBSCRIPTION-REVIEW.md). If eligibility cannot support £0, retain local-only status until the owner explicitly approves a concrete alternative cost. Another AWS deployment requires fresh approval; the temporary endpoint no longer exists.
