# Deployment evidence register

All demonstration data is synthetic. Portfolio project, not an employer integration.

| Lab   | Cloud deployed | Cloud verified | Resource/revision/URL | Authorised smoke | Anonymous rejection           | Cost/teardown        |
| ----- | -------------- | -------------- | --------------------- | ---------------- | ----------------------------- | -------------------- |
| AWS   | NO             | NOT VERIFIED   | None                  | Not run          | Not run against AWS           | No resources created |
| Azure | NO             | NOT VERIFIED   | None                  | Not run          | Storage IAM not live-verified | No resources created |
| GCP   | NO             | NOT VERIFIED   | None                  | Not run          | Not run against Cloud Run     | No resources created |

Local checks and fake-adapter outcomes are in docs/evidence and are not deployment evidence. On 24 October 2026, owner-authorised AWS CLI access passed STS verification, credential resolution and read-only account/template preflight. No application resources were created or invoked. Read-only account access is distinct from cloud deployment. No cloud application screenshots or cost savings are claimed.

For a future deployment append: approval reference, provider/account eligibility evidence redacted for public Git, region, exact commit and IaC hash, command exit status, resource list, timestamp, runtime/build version, authenticated request/output, anonymous 401/403 plus persisted-state comparison, log correlation ID, resource deletion confirmation and billing recheck. Keep cloud-account identifiers and principal emails out of the public case study.

Prioritise one real AWS deployment and teardown before requesting Azure deployment. If future account eligibility cannot support £0, retain local-only status until the owner explicitly approves a concrete alternative cost.
