# User stories and acceptance

Priority is high for all six MVP stories. Approval of the brief authorises implementation; this pack remains reviewable by the owner. US-007/008 are the subsequent local hardening extension, not owner UAT sign-off or historical cloud evidence.

- US-001: As an Operations analyst I want complete requests so delivery can start. Given an authorised requester and valid body, when submitting with a unique idempotency key, then receive 201 and a persistent request. Given missing owner, invalid priority/date or excess size, then receive 400 and no write.
- US-002: As an Approver I need decisions with reasons. Given SUBMITTED version 1, when an authorised approver approves or rejects, then request version 2 and actor/time/reason audit commit together. Given retry of the same key/body, return the same result without another event. Given stale version, duplicate ID or changed body under one key, return 409 and preserve state.
- US-003: As a Data Steward I need inspectable sources. Given supplier then CRM CSV uploaded, when CRM triggers processing, then preserve raw bytes and produce findings containing rule/source/row/values/owner. Given a missing source, fail retryably without PASS. Given duplicate delivery of one source hash, reuse one committed report. Given changed sources under a committed batch ID, reject the conflict.
- US-004: As a Manager I need dependable KPIs. Given an explicit snapshot, when requesting metrics, then overdue uses a strict target-before-snapshot comparison and the SQL reference agrees. Given a valid pending approval, then quality passes while readiness is blocked.
- US-005: As a Service Owner I need access control. Given no verified identity or wrong role, when requesting a protected operation, then 403 and no state change. The real provider endpoint must independently prove IAM denial before any deployed-security claim.
- US-006: As a Manager I need transparent exclusions. Given dirty records, then KPIs disclose numerator/denominator/exclusions and missing identifiers. Given no assessable records, return null ratios rather than an invented 100% score.
- US-007: As a Service Owner I need a decision from a different authenticated principal. Given the submitter also has the approver role, when it approves or rejects its own request, then return 403 with no request/event/receipt mutation. Given missing, duplicate, mismatched or empty-actor submission provenance, then fail closed with 503. This exact-principal rule does not establish separate humans across sessions/accounts.
- US-008: As an Operations analyst I need safe recovery from an uncertain write. Given a transaction committed but the provider acknowledgement was lost, when the identical caller/path/key/body is retried, then return the original result without another event. A 503 must not assert no write occurred; changed-body retries conflict and provider details are not exposed.

UAT sequence: run fixture generation and all checks; submit REQ-0099; reread; approve at version 1; replay; retry with different rationale; inspect audit; process fixture batch twice; omit supplier in a new batch; query snapshot KPIs; drill into REQ-0001 (duplicate) and REQ-0013 (pending approval). Compare output to checked-in snapshots. Do not mark cloud UAT passed from local runs.

Use distinct synthetic requester/approver identities for the new workflow. [Executable reviewer walkthrough and owner acceptance record](UAT-AND-DEMO.md).

## Subsequent local operations extension

- US-009 / BA-009: As an operator I need correlated handler outcomes without copying caller values. Given a completed handler call, emit one bounded operation/status/outcome/duration/correlation record and return a server-context correlation header. Ignore caller correlation/principal headers. A log-sink failure must not change an already committed business result. Do not represent handler-only metrics or liveness as full platform coverage or database readiness.
- US-010 / BA-010: As a Service Owner I need predictable behaviour during dependency failure and contention. Given conditional-only cancellation, return 409; given mixed capacity/contention/unknown cancellation, return retryable 503 without SDK details. Given repeated unavailability and recovery, conflicting or identical-key concurrent decisions and an acknowledgement lost after commit, reconcile one durable business outcome. A bounded local exercise does not prove an accepted production load envelope, real provider backoff or cloud recovery objectives.

[Current execution/limits](AWS-LOCAL-OPERATIONS.md). These are locally tested extensions, not owner UAT approval or an AWS deployment claim.

## Local identifier and release extension

- US-011 / BA-011: As an Operations analyst I need durable opaque references beyond the small four-digit generation space. Given intake without an ID, generate a lowercase UUID v4 reference; identical replay returns it once. Existing four-digit IDs remain readable/decidable. Invalid UUIDs fail 400; forced collision returns 409 without overwrite. Shared CSV/KPI/GCP/SQL consumers accept the same format. A committed report from another rule version conflicts without changing it; use a new batch ID.
- US-012 / BA-012: As a release reviewer I need a known package and a retained previous good local release. Given a trusted expected manifest digest, reject altered manifest/payload/descriptor, extra paths, unhealthy smoke or stale promotion. A successful local journal can promote and restore a verified package with packaged application smoke. Do not infer production promotion, IAM approval or database rollback from this rehearsal.

[Execution and compatibility review](AWS-LOCAL-RELEASE-AND-IDENTIFIERS.md); owner acceptance remains pending.
