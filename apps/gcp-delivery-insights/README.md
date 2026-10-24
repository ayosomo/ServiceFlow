# GCP — Delivery Insights API

All demonstration data is synthetic. Portfolio project, not an employer integration. **Cloud deployment: NOT VERIFIED.**

Managers can see source-backed quality, readiness, overdue and completion metrics. GET /kpis accepts asOf; /findings supports severity/status and bounded pagination; /requests/{id}/insight links actions to findings or operational rules. Empty denominators return null, bad source records become unassessable, and provider failures return 503 rather than fabricated zeros.

Local: set a random LOCAL_API_TOKEN (24+ chars), then `pnpm gcp:local`; the loopback API listens on 8080 and requires Authorization: Bearer <local token>. It uses the explicit fixture repository, not Firestore. Application HTTP tests use Fastify inject and a fake adapter; these are not Firestore emulator tests.

Container build context is repository root: `docker build -f apps/gcp-delivery-insights/Dockerfile -t serviceflow-insights:local .`. Image build and execution passed. With the Compose Firestore service running, `pnpm test:container` seeds only the hardcoded local emulator, starts a non-root Node 22 container, checks anonymous/invalid-token 403 and authenticated exact KPIs, then removes its test container/document. The local server uses fixtures unless FIRESTORE_EMULATOR_HOST is explicitly set; emulator mode uses the real Firestore adapter. Local token mode is forbidden in Cloud Run. Healthcheck tests process liveness; 403 is expected for unauthenticated probes. See docs/evidence/gcp-container.json.

## Manual deployment runbook (blocked by cost gate)

1. Authenticate gcloud outside chat; inspect actual billing/project/free eligibility/region and quotas. Review Cloud Run, Firestore, registry, build, egress/log costs together. Complete COST_GATE and obtain explicit approval before enabling/provisioning billable resources, pushing an image or seeding Firestore.
2. Build/test the image locally; publish by immutable digest only after approval. Avoid a surprise remote build. Review service.yaml placeholders and use a dedicated runtime service account with roles/datastore.viewer scoped to the dedicated project/database as supported; seeder/deployer are separate identities.
3. Keep Cloud Run invoker IAM enabled. Set min=0, max=1, 256 MiB, request CPU billing, concurrency=10, timeout=15. Do not grant allUsers/allAuthenticatedUsers. Configure API_AUDIENCE to the actual canonical service URL and ALLOWED_EMAILS to explicitly approved verified callers. Local auth mode is forbidden when K_SERVICE is present.
4. Create one eligible Firestore Standard database only after the account/region review. Seed serviceflowSnapshots/2026-10-23 from the checked-in raw CRM/findings with the separate approved operator script. Do not commit JSON credentials. Runtime reads through Application Default Credentials.
5. Grant only authorised callers roles/run.invoker. Obtain a valid identity token with matching audience using an appropriate approved identity; do not assume every CLI-issued token has the correct audience/claims. Verify the exact token issuer/audience path in the real environment. No token is saved to evidence.
6. Exercise authenticated KPI, filtered findings and duplicate/pending request insight; compare with independent SQL results. Unsigned access must fail at IAM; forged/expired credentials must fail. Save revision, image digest, redacted IAM, request/log evidence and cost checks.
7. Delete the dedicated Cloud Run service, registry images/repository, Firestore fixture document/database (only if dedicated and safe) and unused dedicated identities after evidence capture; check delayed billing. Do not delete unrelated project resources.

Firestore uses one bounded document (48 demo requests), not a production analytical warehouse. No role-aware business authorisation claim is made; this MVP has a manager caller allowlist.
