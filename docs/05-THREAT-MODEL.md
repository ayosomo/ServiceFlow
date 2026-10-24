# Threat model and operational limits

Trust boundaries: caller → gateway → Lambda → DynamoDB; CSV blob → Function → results; caller → Cloud Run → Firestore. Input files and request bodies are untrusted data.

| Threat                        | Implemented control                                                                  | Remaining verification                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Anonymous/role escalation     | IAM route defaults; server principal allowlists; GCP signature/audience/email checks | AWS signed/unsigned/reader-only checks passed; GCP live auth pending                          |
| Lost updates/double decisions | Conditional transactional version + request/event/receipt                            | AWS persistence/replay/stale checks passed; concurrency race tested locally                   |
| Oversized/malformed input     | 16 KiB API, 1 MiB CSV, 200 rows, strict schemas                                      | Host trigger memory limits under load                                                         |
| Duplicate source delivery     | SHA-256, ETags, immutable findings, create-only summary                              | Real Blob integration and host retries                                                        |
| Partial report write          | Summary committed last; full findings embedded; replay repairs convenience file      | Orphan immutable blobs need manual cleanup                                                    |
| Source races                  | Conditional ETag reads and recheck before commit                                     | Upload discipline: batch IDs immutable after upload; two blobs are not a database transaction |
| Sensitive logs                | Correlation/status only; no request/token logging                                    | AWS application logs inspected; Azure/GCP live logs pending                                   |
| Credentials in Git            | Ignore local settings/.env/keys; placeholder configuration                           | Scan checked-in text before publication                                                       |
| Cost/abuse                    | No cloud action by default; AWS throttle, concurrency 1; GCP max 1/min 0 runbook     | Quotas and alerts are not universal hard spending caps                                        |

Local random tokens are development authentication only. Cloud modes cannot use local tokens in Cloud Run. The AWS template's explicit data policy is restricted to its table; standard Lambda execution policy handles logging. The owner's new AWS project experience has managed defaults that can grant code broader project access, so effective least privilege is not yet verified. Demo owner access is broader than a production caller role; one operator exercising all application roles does not establish separation of duties. Only IAM-authorised Azure uploaders should write incoming blobs; no anonymous HTTP ingestion route exists.

Timeouts, bounded SDK retries and deterministic idempotent work reduce duplicate effects. Audit and idempotency records have no TTL in this small demo: replay remains stable until explicit teardown. Production would need a defined retention and retry window. No automated resolution workflow or business outcome savings is claimed.
