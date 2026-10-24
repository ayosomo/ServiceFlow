# Phase 4 portfolio review

All demonstration data is synthetic. Portfolio project, not an employer integration.

Review scope: README, three standalone case studies, diagrams/contracts, requirement/test/evidence links, deployment boundaries, costs, CV and interview wording. The portfolio uses the GitHub README as its public index. A separate public application UI is optional and has not been built. A live backend is unnecessary for a reviewer to inspect the saved evidence.

| Deliverable                               | Current evidence / decision                                                                                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio index and three case studies    | [README](../README.md), [AWS](case-studies/AWS.md), [Azure](case-studies/AZURE.md), [GCP](case-studies/GCP.md)                                                                            |
| Diagrams, requirements and API contracts  | [Architecture](04-ARCHITECTURE.md), [traceability](01-REQUIREMENTS-MATRIX.md), [AWS OpenAPI](../apps/aws-request-approvals/openapi.yaml)                                                  |
| Reproducible reviewer walkthrough         | [UAT/demo steps and owner acceptance record](UAT-AND-DEMO.md)                                                                                                                             |
| Deployment and cost boundaries            | [Deployment register](DEPLOYMENT-EVIDENCE.md), [cost gate](COST_GATE.md); Azure cloud NOT VERIFIED; GCP health fix local-only                                                             |
| Local improvements versus deployed source | [AWS production backlog](AWS-PRODUCTION-READINESS.md); no new AWS deployment is claimed                                                                                                   |
| Actual visual evidence                    | [Screenshot provenance and source hashes](evidence/SCREENSHOTS.md); browser-rendered saved output, clearly distinct from a live provider console                                          |
| Claims and explanations                   | [CV ledger](CV-CLAIMS.md), [interview notes](INTERVIEW-EXPLANATIONS.md)                                                                                                                   |
| Repository/privacy checks                 | `pnpm check:portfolio`, `pnpm check:secrets`, [known-private-identifier/hash review](evidence/phase4-privacy-and-evidence-review.json); no scanner is a guarantee against all secrets     |
| New local validation                      | [Command/results manifest](evidence/phase4-verification.json); dated transcripts separate from earlier successful runs                                                                    |
| Publication/version/CI                    | [GitHub repository](https://github.com/ayosomo/ServiceFlow), [workflows](https://github.com/ayosomo/ServiceFlow/actions); exact release readback/CI recorded separately after publication |
| Owner review                              | PENDING; no owner acceptance or independent user study is invented                                                                                                                        |

## Current evidence matrix

| Lab   | LOCAL PASS                                                      | CLOUD DEPLOYED           | CLOUD VERIFIED                                                                 | PUBLIC CASE STUDY REVIEWED                            |
| ----- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| AWS   | Yes; new BA-007/008 improvements local-only                     | Historical demo; removed | Original deployed feature set verified; new controls unverified in cloud       | Agent editorial/link review; owner acceptance pending |
| Azure | Yes, including exact ZIP in real local Functions host + Azurite | No                       | **NOT VERIFIED**                                                               | Agent editorial/link review; owner acceptance pending |
| GCP   | Yes; corrected health passes locally                            | Historical demo; removed | Business APIs verified; deployed health failed; corrected route not redeployed | Agent editorial/link review; owner acceptance pending |

## Editorial review decisions

- Replace superseded account/credit and GCP deployment wording in current summaries; retain immutable historical test/provider responses and source commit references.
- Keep financial balances, account/principal IDs, support traces and credentials outside public Git. Private Notion is a learning record, not a public evidence endpoint.
- Explain what failed: Docker/WSL recovery, overlapping rule count, host port parsing and provider health routing. Local retries do not erase those failures.
- A screenshot of a saved log/report is visual navigation evidence only; the linked raw source, timestamp, hash and execution command carry its provenance. No cloud-console screenshot, product UI or accessibility audit is claimed.
- Do not present the local AWS principal exclusion as independent human approval, a production release or a previously deployed feature.

Remaining external actions are owner UAT/review, Microsoft's no-upgrade Azure entitlement response, delayed billing reconciliation and separately reviewed/approved cloud verification if requested. None prevents a clearly labelled local-only Azure case study. No chargeable resources, plan upgrades or redeployments are authorised by this review.
