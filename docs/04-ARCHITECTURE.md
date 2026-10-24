# Implemented architecture and proposed cloud topology

All demonstration data is synthetic. Portfolio project, not an employer integration. AWS and GCP business APIs were deployed in approved temporary runs on 24 October 2026, then removed. Azure cloud remains NOT VERIFIED. GCP's health correction and the new AWS same-principal/provenance controls are local-only changes after their historical deployments.

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
  L->>D: Consistent request and submission audit read
  alt Missing/ambiguous provenance or same submitting principal
    L-->>A: 503 provenance unavailable or 403 own decision
  else Provenance accepted and principal differs
    L->>D: Read scoped receipt
    alt Unchanged replay
      L-->>A: Original committed result
    else New decision
      L->>D: Transaction: version check, request, event, receipt
      alt Condition conflict
        D-->>L: Conditional failure
        L->>D: Read receipt for safe replay
      end
      L-->>A: 200, 409 or bounded 503
    end
  end
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

Only submit and approve/reject transitions are exposed through the AWS MVP. Later transitions are defined and tested in the shared domain for clarity, not claimed as API workflows. Local AWS HTTP uses an in-memory adapter and distinct random requester/approver environment tokens on loopback. Cloud Lambda accepts only API Gateway IAM context. The approval sequence above describes the current local code; the new provenance/principal check was not deployed in the earlier AWS run. Cloud Run independently verifies audience, signature and allowlisted verified email; there are no mutation routes. Firestore uses ADC with a dedicated read-only runtime identity.

The approved Cloud Run run used a shared custom audience at platform/app layers, separate runtime and caller identities, service/revision max one, zero minimum and CPU boost disabled. Actual dual-header smoke used X-Serverless-Authorization for platform IAM and an intact Authorization token for app signature/audience/allowlist checks. Runtime read the dedicated default Firestore database with its service identity. No live lab resource remains. See [actual results](GCP-CLOUD-RESULTS.md) and the [historical approved proposal](GCP-DEPLOYMENT-PROPOSAL.md).
