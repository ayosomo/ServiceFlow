# Interview explanations

Independent portfolio, synthetic data. AWS has actual cloud deployment/test/teardown evidence; GCP business routes also have real cloud verification and teardown evidence, with a failed deployed health path; Azure remains locally tested.

## Ninety-second business story

“I used a fictional service-request process to demonstrate how I translate a business problem into testable delivery. I defined stakeholder needs, requirements and acceptance criteria. Forty-eight synthetic requests connect traceable approval, source reconciliation and transparent KPIs. I preserved dirty inputs and separated data quality from approval waits and late delivery. PostgreSQL provides an independent relational reference. After cost review and explicit approval, I deployed and tested the request API on AWS and the insights API on Google Cloud, then independently checked removal of the active resources. The Azure Functions pipeline passed an actual local host test, but cloud deployment is blocked by entitlement. The GCP business routes passed while its health path failed; the correction is local-only. I keep those boundaries visible in the evidence. This independent portfolio is separate from my professional release-delivery experience.”

## AWS three-minute demo

Start with BA-001/002 and OpenAPI. Walk through the saved actual cloud evidence: create/reread, approve, replay, 409 conflicts, unsigned and signed reader-only 403s, then direct audit/receipt checks and teardown. Explain the DynamoDB transaction separately from gateway authentication and business-role allowlists. The temporary endpoint is removed; use local execution for an interactive demo. One owner exercised all roles, so do not imply independent human approval.

Then show the local-only BA-007/008 extension: two synthetic identities, requester decision denial, fail-closed provenance and retry after a lost acknowledgement. Explain why a 503 can follow a committed write. Different principal strings do not prove different humans; stable identity and effective permission review remain production blockers. [Backlog](AWS-PRODUCTION-READINESS.md).

## Azure three-minute demo

Show two raw CSVs and eight affected rows. Run the batch, inspect twelve rule findings, both conflicting dates and source hash. Rerun and demonstrate one committed result. Remove a source in a fresh batch and show retryable failure. Explain byte/row limits, ETags, immutable source discipline and summary commit marker. Distinguish native Azurite adapter testing, Functions-host execution and live managed identity.

## GCP three-minute demo

Show KPI catalogue before the response. Query fixed asOf; inspect numerator/denominator/exclusions. Compare overdue/on-time output with SQL; inspect duplicate request versus a valid pending approval. Explain null zero-denominator handling and source-backed actions. Show non-root Dockerfile and server token verification; explicitly say whether the image/Firestore/provider has actually been run.

## What failed and what I would improve

Docker initially could not start because a frozen WSL VM held its disk. An owner-approved Windows restart restored the engine; real container/SQL/emulator/host checks then passed. The first reconciliation-count expectation overlooked overlapping findings; inspecting preserved values corrected the assertion without changing input data. Actual host testing caught a .NET/Node emulator-port mismatch, fixed with an explicit local endpoint. AWS cloud smoke and teardown passed; GCP business smoke passed with an explicit health exception. Budget listing returned an empty body, so no alert claim was made. Next: owner UAT, Azure no-upgrade entitlement clarification and the AWS production backlog; any new cloud run needs fresh approval. A tiny fixture cannot prove performance or business savings.

## GCP verified interview account

“I defined KPI boundaries and checked them against SQL, then deployed one authenticated TypeScript image to Cloud Run with a read-only Firestore runtime identity. Live responses matched the 48-record synthetic reference; unsigned/forged access and non-allowlisted app identity were rejected, and the snapshot stayed unchanged. I also found a real deployment limitation: healthz hit a provider-reserved path while the KPI route worked. I fixed and tested health locally rather than claiming it was deployed. I removed the lab resources, independently checked absence and retained the Free Trial. This is independent portfolio work, not a production reporting platform or measured saving.”

[Exact run, scope and cleanup](GCP-CLOUD-RESULTS.md). No ongoing hosting, independent human approval or production-scale security/performance claim is made.

## Local operations follow-up

“I made handler logs useful without copying user inputs: bounded operation/status/outcome/duration plus server-context correlation, with tests for spoofed headers and log-sink failures. I also separated conditional conflicts from retryable SDK capacity/contention failures. I ran bounded memory and DynamoDB Local exercises with injected outages, a lost acknowledgement after commit and sixteen-way competing or identical-key decisions, then reconciled one final decision/audit. These are local tests, not cloud monitoring, a real AWS outage or evidence of production-scale performance. Service targets, live alarms, stable human identity and recovery/retention remain open.”

[Exact local operations boundaries](AWS-LOCAL-OPERATIONS.md).
