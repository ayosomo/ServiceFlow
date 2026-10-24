# Data dictionary and source map

Seed: 2301026, LCG (1664525 × state + 1013904223) modulo 2^32. Snapshot: 2026-10-23T00:00:00.000Z. Generator and JSON/CSV snapshots are checked in. There are 48 canonical requests, 48 raw CRM rows and 48 supplier rows. No source is repaired in place.

| Field             | Type / nullability                             | Source → target                               | Accepted values / rules                                             | Owner            |
| ----------------- | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | ---------------- |
| requestId         | string, required                               | CRM requestId → requests.request_id           | Legacy REQ-0001 or lowercase REQ-UUID-v4; duplicates critical       | Operations       |
| customerId        | string, required                               | CRM → customer_id                             | SYN-001 pattern; fictional only                                     | Operations       |
| summary           | string, required                               | CRM → summary                                 | Trimmed 5–200 characters                                            | Service Owner    |
| ownerTeam         | string, required                               | CRM → owner_team                              | Nonempty, max 60; missing is critical                               | Service Owner    |
| priority          | enum, required                                 | CRM → priority                                | LOW/MEDIUM/HIGH/CRITICAL                                            | Operations       |
| status            | enum, required                                 | CRM → status                                  | DRAFT/SUBMITTED/APPROVED/REJECTED/IN_PROGRESS/DONE                  | Delivery         |
| submittedAt       | UTC ISO timestamp                              | CRM → submitted_at                            | Valid UTC date                                                      | Operations       |
| targetAt          | UTC ISO timestamp                              | CRM → target_at                               | >= submitted; CRM is planned-target authority                       | Delivery         |
| actualCompletedAt | UTC ISO, nullable                              | CRM → actual_completed_at                     | Required when DONE; >= submitted                                    | Delivery         |
| approvalRequired  | boolean                                        | CRM → approval_required                       | CSV literal true/false only                                         | Approver         |
| approverId        | string, nullable                               | CRM → approver_id                             | Required for approved/in-progress/done when approval required       | Approver         |
| version           | positive integer                               | CRM → version                                 | Optimistic concurrency                                              | API              |
| supplierUpdatedAt | UTC ISO timestamp                              | Supplier → source_updates.supplier_updated_at | Latest per request via ROW_NUMBER                                   | Supplier liaison |
| supplierMilestone | string                                         | Supplier → supplier_milestone                 | Preserved contextual source milestone; CRM status remains authority | Supplier liaison |
| supplierTargetAt  | UTC ISO timestamp                              | Supplier → supplier_target_at                 | Mismatch REVIEW with both values                                    | Data Steward     |
| AuditEvent        | required identity/time/correlation/details     | API → DynamoDB event / local events           | Principal from verified context; reason mandatory for decision      | API              |
| Finding           | ruleId/source/row/values/owner/severity/status | Engine → quality_findings / JSON              | CRITICAL or REVIEW; OPEN until a new verified process resolves it   | Data Steward     |

CSV decoding is explicit: version → number, literal booleans → boolean, blank optional dates/principals → null. Bad values remain bad; no date/status repairs. Raw CSV remains byte-identical.

Eight affected CRM rows: 1 and 2 duplicate REQ-0001; 3 missing owner; 4 invalid status; 5 invalid target; 6 target before submission; 7 supplier date conflict; 8 missing ID. There are 12 findings (8 CRITICAL, 4 REVIEW). A missing ID has both missing and invalid-format rule evidence. Row 6 also has a supplier-date discrepancy. Supplier references 2 and 8 no longer match raw CRM and are REVIEW because match is optional. This is eight affected records, not eight findings.

PostgreSQL stores all 48 valid canonical fixtures as a relational reference, raw inputs separately, and a 41-request metric_eligible subset derived from dirty CRM. Canonical values are never substituted into dirty-source metrics. Raw missing/duplicate IDs do not enter FK-constrained request tables.

Generated IDs now use UUID v4; raw deterministic fixture IDs remain unchanged. The [contract/migration note](AWS-LOCAL-RELEASE-AND-IDENTIFIERS.md) defines exact compatibility and rule-version-2 replay handling. UUID syntax validates references, not the uniqueness of a business request.
