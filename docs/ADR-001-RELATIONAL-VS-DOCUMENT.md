# ADR 001 — Relational reference and hosted document stores

Accepted for this synthetic MVP, 24 October 2026.

PostgreSQL makes relationships and SQL evidence explicit: PK/FK/check constraints, approvals/events joined by request, latest supplier updates, filtered aggregates and indexed target lookups. Transactions and readable SQL support auditability and independent metric verification. A local database avoids managed SQL cost. It is not replicated to three providers.

DynamoDB fits the request-by-ID workflow. One table uses pk=request ID and sk=REQUEST or EVENT#time#UUID; idempotency records use IDEMP#hash/RECEIPT. Strong reads and conditional transactions protect request, audit and receipt atomically. Provisioned capacity starts at 1/1 only after eligibility review. No GSI is justified. Document access simplifies hosting but loses relational ad-hoc joins and requires explicit consistency/concurrency design.

Firestore serves one bounded immutable snapshot document with up to 200 records. It uses a single document read per query and local metric computation; this is a compact demonstration, not a scalable reporting warehouse. Runtime receives read-only datastore permission. Seeding is a separate approved operator action. Document size and bounded input limit prevent an unbounded scan. A production design would partition/version snapshots, validate document structure on writes, and precompute metrics or use an analytical store.

Azure Blob is appropriate for immutable source and result documents; no queue/table is needed in this MVP. CRM upload triggers after supplier is committed. Create-only summary is the report commit point, not a claim that multiple blob writes are transactional. A queue/event-based trigger may improve latency and readiness at additional operational complexity.

Consistency, IAM and cost control matter more than a list of services. Hosted NoSQL provisioning is pending; only actual tests may support a persistence claim.
