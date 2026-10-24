# Interview explanations

Independent portfolio, synthetic data, local evidence only unless the deployment register says otherwise.

## Ninety-second business story

“I used a fictional service-request process to demonstrate how I translate a business problem into testable delivery. I defined Operations, Approver, Coordinator and Manager needs, then wrote requirements and acceptance criteria. The same forty-eight synthetic requests connect three slices: complete request intake and traceable approval, auditable reconciliation of conflicting source files, and metrics that separate data quality from readiness and lateness. I preserved dirty inputs and recorded rule-level findings rather than cleaning away inconvenient evidence. PostgreSQL provides a relational reference for the KPI calculations, while the cloud-target adapters illustrate different access patterns. I tested failure conditions and tracked local versus provider evidence explicitly. The live deployments remain pending account, cost and approval gates; I would not describe them as deployed experience. This independent work is separate from my professional release-delivery experience.”

## AWS three-minute demo

Start with BA-001/002; show OpenAPI. Submit a valid request; reread; approve once; replay the same key; show one audit event per actual change. Change version/reason/key to show 409. Show anonymous/wrong-role 403. Explain DynamoDB conditional transaction and role allowlist separately from gateway authentication. End with actual local log and the NOT VERIFIED cloud row.

## Azure three-minute demo

Show two raw CSVs and eight affected rows. Run the batch, inspect twelve rule findings, both conflicting dates and source hash. Rerun and demonstrate one committed result. Remove a source in a fresh batch and show retryable failure. Explain byte/row limits, ETags, immutable source discipline and summary commit marker. Distinguish native Azurite adapter testing, Functions-host execution and live managed identity.

## GCP three-minute demo

Show KPI catalogue before the response. Query fixed asOf; inspect numerator/denominator/exclusions. Compare overdue/on-time output with SQL; inspect duplicate request versus a valid pending approval. Explain null zero-denominator handling and source-backed actions. Show non-root Dockerfile and server token verification; explicitly say whether the image/Firestore/provider has actually been run.

## What failed and what I would improve

Docker initially could not start because a frozen WSL VM held its disk. An owner-approved Windows restart restored the engine; real container/SQL/emulator/host checks then passed. The first reconciliation-count expectation overlooked overlapping findings; inspecting preserved values corrected the assertion without changing input data. Actual host testing also caught a .NET/Node emulator-port mismatch, fixed with an explicit local endpoint. SAM/Bicep validation passed. Future work: review actual accounts/costs, obtain explicit approval, deploy and test AWS first, then Azure/GCP, and introduce identity groups/retention policies before production use. A tiny fixture cannot prove performance or business savings.
