# Interview explanations

Independent portfolio, synthetic data. AWS has actual cloud deployment/test/teardown evidence; Azure and Google Cloud remain locally tested only.

## Ninety-second business story

“I used a fictional service-request process to demonstrate how I translate a business problem into testable delivery. I defined stakeholder needs, requirements and acceptance criteria. Forty-eight synthetic requests connect traceable approval, source reconciliation and transparent KPIs. I preserved dirty inputs and separated data quality from approval waits and late delivery. PostgreSQL provides an independently checked relational reference. After account/cost review and explicit approval, I deployed the approval API on AWS Lambda, API Gateway and DynamoDB. Fifteen real HTTP calls verified valid actions, retries, conflicts and access denial, with direct audit checks. I then removed the resources and independently verified teardown. Azure and Google Cloud are locally tested and still await their own cloud gates. This independent portfolio is separate from my professional release-delivery experience.”

## AWS three-minute demo

Start with BA-001/002 and OpenAPI. Walk through the saved actual cloud evidence: create/reread, approve, replay, 409 conflicts, unsigned and signed reader-only 403s, then direct audit/receipt checks and teardown. Explain the DynamoDB transaction separately from gateway authentication and business-role allowlists. The temporary endpoint is removed; use local execution for an interactive demo. One owner exercised all roles, so do not imply independent human approval.

## Azure three-minute demo

Show two raw CSVs and eight affected rows. Run the batch, inspect twelve rule findings, both conflicting dates and source hash. Rerun and demonstrate one committed result. Remove a source in a fresh batch and show retryable failure. Explain byte/row limits, ETags, immutable source discipline and summary commit marker. Distinguish native Azurite adapter testing, Functions-host execution and live managed identity.

## GCP three-minute demo

Show KPI catalogue before the response. Query fixed asOf; inspect numerator/denominator/exclusions. Compare overdue/on-time output with SQL; inspect duplicate request versus a valid pending approval. Explain null zero-denominator handling and source-backed actions. Show non-root Dockerfile and server token verification; explicitly say whether the image/Firestore/provider has actually been run.

## What failed and what I would improve

Docker initially could not start because a frozen WSL VM held its disk. An owner-approved Windows restart restored the engine; real container/SQL/emulator/host checks then passed. The first reconciliation-count expectation overlooked overlapping findings; inspecting preserved values corrected the assertion without changing input data. Actual host testing caught a .NET/Node emulator-port mismatch, fixed with an explicit local endpoint. AWS cloud deployment, smoke and teardown subsequently passed; regional logging worked despite a documentation ambiguity. Budget listing returned an empty body, so no alert claim was made. Next: Azure/GCP account review and approved deployments, then identity-group and retention decisions before production use. A tiny fixture cannot prove performance or business savings.
