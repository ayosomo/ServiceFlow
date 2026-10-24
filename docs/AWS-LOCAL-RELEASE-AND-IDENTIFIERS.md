# AWS local release rehearsal and request identifiers

All demonstration data is synthetic. Portfolio project, not an employer integration.

24 October 2026: AWS-P08 is **PARTIAL**; AWS-P13 has a **LOCAL IMPLEMENTATION**. Production release remains HOLD. These changes have not been cloud deployed. Azure cloud remains **NOT VERIFIED**. No cloud API, billing change, plan upgrade or paid resource is part of this iteration.

## Business acceptance and identifier compatibility

BA-011 / US-011 replaces the small randomly generated four-digit identifier space while preserving existing references. New requests without an explicit ID receive `REQ-` followed by a lowercase UUID v4 from Node's `randomUUID()`. Existing `REQ-0001` through `REQ-9999` references, including the four-digit `REQ-0000` format, remain valid; no data is renumbered. Explicit valid legacy or UUID IDs remain accepted. UUID collisions are improbable, not impossible: a forced duplicate returns 409 without overwriting the existing request. An unchanged idempotency retry returns the original ID before generating another one.

The shared schema, AWS intake/read/decision paths, operation classification, OpenAPI 0.4.0, KPI eligibility, CSV reconciliation, GCP insight route and PostgreSQL check constraint use the same contract. Tests reject uppercase UUIDs, wrong UUID versions/variants and malformed references. A syntactically valid missing UUID insight returns 404, rather than an invalid-format 400. Default response IDs have changed: clients must treat the ID as an opaque string and review any four-digit validation, field width, routing or reporting assumptions before production acceptance. This is not owner sign-off or a promise of globally unique business records.

`db/migrations/002-request-ids.sql` broadens the check inside the transactional migration runner; it does not rewrite rows or primary/foreign keys. The rollback-only SQL test inserts a UUID request and referencing event, verifies their join, rejects an invalid UUID with PostgreSQL 23514, then rolls back. The 48 requests and 96 seeded events remain unchanged. **Do not restore the old check or old application readers after UUID rows exist.** A database/schema rollback needs a separately reviewed compatibility and data recovery plan; the release journal below does not provide one.

The deterministic raw JSON/CSV sources remain byte-for-byte unchanged. Derived findings include the broader validation message; the fixture manifest declares the identifier contract and reconciliation rule version **2**. Rule-1 committed summaries remain immutable: replay under the new rule version fails with a batch conflict and requires a new batch ID. Existing source hashes still describe source bytes only. New immutable findings paths include `rules-2` so an older orphan from an interrupted pre-summary run cannot be reused; legacy orphan bytes are retained. This prevents silently presenting an older report as a rule-2 result. The older exact Azure ZIP evidence describes its historical package; the new rule-2 Functions/Azurite host run is separate local evidence.

## Artifact integrity and local promotion

BA-012 / US-012 adds a small local artifact contract. After `pnpm build`, run `pnpm aws:artifact prepare`. It prepares a digest-named directory under ignored `work/aws-artifacts/` with exactly `lambda.js`, a fixed CommonJS `package.json` and a strict bounded manifest. The manifest records SHA-256 and length for both payloads, source commit, dirty-tree state, Node 22 handler and ID contract. Existing candidates are verified rather than overwritten. Retain the reported manifest digest independently, then inspect with:

```sh
pnpm aws:artifact verify <artifact-directory> <trusted-manifest-sha256>
pnpm aws:release-test
```

Verification checks the externally supplied digest before trusting manifest contents, then checks payload length/digest and descriptor bytes. Extra files, nested directories and links are rejected. Inspection never imports candidate code. It does not establish trust if an attacker can replace both the artifact and the expected digest, or protect a mutable filesystem from an administrator. Only the task's own prepared bundle is loaded by the rehearsal, after verification; do not use this harness to execute an untrusted package.

The rehearsal runs the actual bundled Lambda factory with synthetic gateway context and memory persistence. It verifies generated UUID intake, replay, submitter denial, distinct-principal decision/replay and exactly two audit events. A same-size corrupted bundle is rejected before loading; a checksum-valid unhealthy fixture and stale promotion also fail. An append-only local journal records original application → labelled synthetic candidate B → original application, verifying the restored application's smoke again. B is a small test fixture, not a second released application version. A cooperative exclusive lock and expected-previous digest prevent stale local promotion; prior journal entries are retained.

Identical bundle bytes plus identical metadata produce identical manifests. This is not a fully reproducible build, signed attestation, protected CI approval, production environment, effective IAM proof or real traffic/infrastructure/data rollback. The local journal has a 1,000-entry bound; failures retain candidates for inspection. A crashed lock holder needs manual investigation before removing its lock. The CI workflow runs preparation/rehearsal without cloud credentials or deployment.

## Actual evidence and remaining gates

[Command results](evidence/aws-readiness-3-verification.json), [unit cases](evidence/aws-readiness-3-unit-results.json), [release rehearsal](evidence/aws-readiness-3-release-rehearsal.json), [HTTP output](evidence/aws-readiness-3-http-responses.txt), [SQL output](evidence/aws-readiness-3-sql.txt), [Azure rule-2 host](evidence/aws-readiness-3-azure-host.json), [GCP local container](evidence/aws-readiness-3-gcp-container.json), [source/hash/privacy review](evidence/aws-readiness-3-review.json).

Two initial journal runs failed with sandbox `EPERM`; the same journal passed outside that sandbox. Initial lint failures were corrected before final verification. A later repeat during container rebuilding timed out on local HTTP startup and a PostgreSQL connection; both final repeats passed, with the failed logs retained and no proven cause assigned. [Retained failures](evidence/aws-readiness-3-initial-failure.json) distinguish environment and code-quality issues. No general Windows application defect or cloud failure is inferred.

Next: owner acceptance of opaque ID compatibility and service scope; stable individual identities; retention/restore consistency; protected staging/production environments and independently approved promotion; scoped OIDC; trusted artifact provenance; cloud preflight, smoke and compatible rollback rehearsal. Recheck account eligibility, quota, pricing and the exact resource proposal, then obtain explicit deployment approval. Keep all Free plans; do not upgrade to bypass a restriction.

Design references: [Node 22 randomUUID](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptorandomuuidoptions), [AWS Lambda Node packaging](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html). Those sources describe platform behaviour, not proof that this implementation is production ready.
