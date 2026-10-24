# Problem and personas

Fictional problem scenario based on generic delivery patterns. All demonstration data is synthetic. Portfolio project, not an employer integration.

AS-IS: requests arrive with incomplete fields; decisions are fragmented across messages; supplier dates contradict internal plans; a manager cannot tell a data defect from a legitimate approval wait or late delivery.

TO-BE: structured request intake and versioned decisions; preserved feeds with explicit reconciliation findings; metrics with definitions, denominators and record evidence.

| Actor                | Pain point                         | Decision supported                                               | Requirement |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------- | ----------- |
| Operations analyst   | Incomplete requests                | Return malformed submissions with field errors                   | BA-001      |
| Service Owner        | Lost accountability                | Name an owner and inspect audit history                          | BA-001/002  |
| Delivery Coordinator | Conflicting updates                | Refer discrepancies to accountable teams                         | BA-003      |
| Approver             | Untraceable or duplicate decisions | Approve/reject once with rationale and expected version          | BA-002      |
| Manager              | Misleading aggregated status       | Prioritise accurate overdue requests separately from data repair | BA-004/006  |
| Data Steward         | Unclear exceptions                 | Inspect source, row, values, rule and owner before correction    | BA-003      |

Success means reproducible acceptance evidence, not invented time/cost savings. No real employer data, payments, public write endpoints, managed SQL or live inter-cloud integration. Local artefacts are useful without cloud publication.
