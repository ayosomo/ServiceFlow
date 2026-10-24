# Implemented architecture and proposed cloud topology

All demonstration data is synthetic. Portfolio project, not an employer integration. AWS nodes were deployed and verified as a temporary demo on 24 October 2026, then removed. Azure and Google Cloud nodes describe locally tested configuration; their live deployment remains unverified.

```mermaid
flowchart LR
  F["Seeded canonical and raw fixtures"] --> P["Local PostgreSQL relational reference"]
  U["IAM caller"] --> A["AWS HTTP API: AWS_IAM"]
  A --> L["Lambda: validation and role allowlist"]
  L --> D["DynamoDB: request, audit, idempotency transaction"]
  F --> B["Azure incoming: supplier then CRM"]
  B --> FN["Functions v4 blob trigger"]
  FN --> R["Results: immutable findings and commit summary"]
  M["Authorised manager"] --> C["Private Cloud Run and token verification"]
  C --> FS["Firestore bounded snapshot document"]
```

```mermaid
sequenceDiagram
  participant A as Approver
  participant G as HTTP API IAM
  participant L as Lambda
  participant D as DynamoDB
  A->>G: Signed decision, version, reason, idempotency key
  G->>L: Verified IAM context
  L->>L: Check approver allowlist and schema
  L->>D: Consistent receipt/request read
  L->>D: Transaction: version check, request, event, receipt
  alt Condition conflict
    D-->>L: Conditional failure
    L->>D: Read receipt for safe replay
  end
  L-->>A: 200 or 409
```

```mermaid
flowchart LR
  S["Supplier upload first"] --> I["incoming/batch/supplier.csv"]
  CRM["CRM uploaded second"] --> IC["incoming/batch/crm.csv"]
  IC --> T["Blob trigger; read both with ETags"]
  I --> T
  T --> V["Strict CSV parsing and rule engine"]
  V --> H["Content-addressed findings"]
  H --> CM["Create-only summary: atomic commit marker"]
  CM --> O["Recoverable findings.json convenience copy"]
```

```mermaid
stateDiagram-v2
  DRAFT --> SUBMITTED
  SUBMITTED --> APPROVED
  SUBMITTED --> REJECTED
  APPROVED --> IN_PROGRESS
  IN_PROGRESS --> DONE
```

Only submit and approve/reject transitions are exposed through the AWS MVP. Later transitions are defined and tested in the shared domain for clarity, not claimed as API workflows. Local AWS HTTP uses an in-memory adapter and a random environment token on loopback. Production Lambda accepts only API Gateway IAM context. Cloud Run independently verifies audience, signature and allowlisted verified email; there are no mutation routes. Firestore uses ADC with a dedicated read-only runtime identity.
