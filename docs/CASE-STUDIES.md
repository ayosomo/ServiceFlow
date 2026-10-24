# ServiceFlow — three implementation case studies

All demonstration data is synthetic. Portfolio project, not an employer integration. AWS has actual deployment/test/teardown evidence; Azure and Google Cloud outcomes remain local implementation/testing only. See the evidence register before reusing any claim.

## AWS: make approval traceable

Problem: Service Owners cannot act confidently on incomplete intake or an untraceable decision. Requirement: BA-001/002/005, a complete request, an authorised decision and an audit trail. Implementation: strict input schema, SUBMITTED-only decisions, optimistic version, explicit approver principal, reason and correlation ID. DynamoDB transaction groups the request, event and idempotency receipt. Negative tests show malformed/unauthorised/stale/conflicting attempts do not claim a successful mutation.

Decision: a small request-by-ID access pattern justifies a single DynamoDB table without a secondary index. The SAM configuration protects all routes with IAM, and the handler adds business-role allowlists. Local HTTP tokens are a separate development mode. After explicit approval and Free-plan checks, the eu-north-1 stack deployed successfully. Fifteen real HTTP calls verified valid submission/approval, replay, malformed input, duplicate/stale conflicts, unsigned denial and signed reader-only mutation denial. Independent DynamoDB checks confirmed one approved request, two audit events and two receipts; regional logs/retention passed. All dedicated resources were independently verified removed. [Cloud evidence](evidence/aws-cloud-verification.json).

Limitation: one owner exercised all roles, so the demo does not establish independent human approval. Managed project defaults prevent an effective least-privilege claim. The Free plan remained active; delayed/final billing is not independently verified. Lesson: authentication, business authorisation and concurrency are different acceptance requirements, and teardown is part of delivery evidence.

## Azure: expose rather than hide inconsistent sources

Problem: the Delivery Coordinator sees contradictory CRM and supplier updates. Requirement: BA-003, preserve both sources and produce inspectable exception evidence. Implementation: deterministic CSV parsing, explicit type conversion, strict byte/row limits, SHA-256/ETag provenance, severity/rule/source/row/value/owner findings. Missing input fails retryably. Create-only summary is the commit point; retries reuse the same hash, conflicting batch reuse fails. Eight affected CRM records produce twelve findings because rules overlap.

Decision: use Blob Storage for immutable source/result artefacts, a CRM blob trigger and no unnecessary queue/table. Polling trigger is tied to the selected Windows Consumption design. Limitation: multiple blob writes are not atomic; immutable source discipline and final summary publication are operational controls. Host-trigger, managed identity and cloud billing evidence remain distinct from a pure pipeline or native emulator test. Lesson: a valid pending approval is readiness-blocked, not dirty data.

## GCP: make KPI definitions reviewable

Problem: a Manager needs actions, not one opaque red/green score. Requirement: BA-004/006, snapshot metrics that reconcile with SQL and disclose exclusions. Implementation: Fastify read-only routes, explicit UTC asOf, transparent numerator/denominator/exclusions, critical-data unassessability, bounded findings drill-down and rule-backed recommendations. Authentication verifies signed identity-token audience and allowlisted verified email. Firestore is accessed through a small dedicated repository using ADC.

Decision: one bounded snapshot document makes the demo predictable and easy to inspect. A non-root Node container defines the deployment unit. The actual container -> Firestore emulator -> HTTP response check passed and matched the independently checked KPIs. Limitation: this is not a production reporting warehouse or a deployed role-aware analytics platform; live Firestore/Cloud Run evidence is still absent. Lesson: independent aggregate SQL and zero-denominator tests prevent attractive but unsupported portfolio metrics.

## Evidence and honest outcomes

The implementation links stakeholder need → rule/API → acceptance test → saved execution log. No employer data or commercial savings was used. Failure evidence includes the Docker startup blocker and an initially incorrect findings-count assertion, corrected from the preserved fixture output. Test source and local command evidence are supplied; cloud screenshots and URLs are not fabricated. Public GitHub publication and owner review remain explicit gates.
