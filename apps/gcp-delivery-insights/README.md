# GCP â€” Delivery Insights API

All demonstration data is synthetic. Portfolio project, not an employer integration. **Cloud business APIs: VERIFIED AND TORN DOWN. Deployed `/healthz`: FAILED; `/health` correction: LOCAL PASS, NOT REDEPLOYED.**

Managers can see source-backed quality, readiness, overdue and completion metrics. GET /kpis accepts asOf; /findings supports severity/status and bounded pagination; /requests/{id}/insight links actions to findings or operational rules. Empty denominators return null, bad source records become unassessable, and provider failures return 503 rather than fabricated zeros.

Local: set a random LOCAL_API_TOKEN (24+ chars), then `pnpm gcp:local`; the loopback API listens on 8080 and requires Authorization: Bearer <local token>. It uses the explicit fixture repository, not Firestore. Application HTTP tests use Fastify inject and a fake adapter; these are not Firestore emulator tests.

Container build context is repository root: `docker build -f apps/gcp-delivery-insights/Dockerfile -t serviceflow-insights:local .`. Image build and execution passed. With the Compose Firestore service running, `pnpm test:container` seeds only the hardcoded local emulator, starts a non-root Node 22 container, checks anonymous/invalid-token 403 and authenticated exact KPIs, then removes its test container/document. The local server uses fixtures unless FIRESTORE_EMULATOR_HOST is explicitly set; emulator mode uses the real Firestore adapter. Local token mode is forbidden in Cloud Run. Healthcheck tests process liveness; 403 is expected for unauthenticated probes. See docs/evidence/gcp-container.json.

## Deployment proposal and runbook â€” approval pending

The [exact temporary London proposal](../../docs/GCP-DEPLOYMENT-PROPOSAL.md) includes trial/account evidence, target-project bootstrap gates, resource/IAM inventory, GBP price scenario, smoke limits and teardown. The approved run completed against a new isolated project; its active lab resources were independently verified removed. The initial existing-project inventory was partial because its APIs stayed disabled. See [actual results](../../docs/GCP-CLOUD-RESULTS.md). No standing redeployment approval exists.

`service.yaml` sets service/revision min=0/max=1, 256 MiB, 1 vCPU, request CPU billing, startup boost off, concurrency 10 and timeout 15. The container smoke now enforces the same 256 MiB memory limit; see [actual result](../../docs/evidence/gcp-proposal-container.json). Manifest checks are local configuration evidence, not server-side deployment validation.

The custom audience `https://serviceflow.example/insights` is set at both IAM platform and app layers before creation. It is a reserved identifier, not a purchased domain; invoke the actual returned HTTPS URL. The approved caller must have service-scoped `roles/run.invoker` and appear in ALLOWED_EMAILS. Keep invoker IAM enabled and supply no allUsers/allAuthenticatedUsers binding.

For real calls, send an impersonated Google ID token with that audience and verified caller email in **both** `X-Serverless-Authorization` (platform IAM) and `Authorization` (intact signed app token). Never trust decoded unsigned claims or log tokens. [Google authentication guidance](https://docs.cloud.google.com/run/docs/authenticating/service-to-service), [custom audience configuration](https://docs.cloud.google.com/run/docs/configuring/custom-audiences).

Runtime uses ADC from its dedicated read-only service account. Local CLI login alone is not SDK ADC. The guarded SDK seeder needs separately configured credentials; the proposal instead specifies a keyless, short-lived impersonated token and create-only Firestore REST seed operator, to be reviewed before the approved write. No credential files belong in Git.

Firestore uses one bounded document (48 demo requests), not a production analytical warehouse. No role-aware business authorisation claim is made; this MVP has a manager caller allowlist.

## Health route correction

Use authenticated `GET /health` for process liveness. On the deployed image, `/healthz` returned Google's HTML 404 without request logs while normal authenticated KPI routes returned 200. Google's [known issues](https://docs.cloud.google.com/run/docs/known-issues) recommend avoiding paths ending in z. The app, Docker healthcheck and local HTTP/container scripts now use `/health`. Local auth, provider-error isolation and 256 MiB container checks passed; this corrected image was **not** uploaded or deployed. The completed single-image run remains pinned to source `5e709d648fc2ef0bc68eeb7258d1fd9a9741905c`.

## Health route correction

Use authenticated `GET /health` for process liveness. On the deployed image, `/healthz` returned Google's HTML 404 without request logs while normal authenticated KPI routes returned 200. Google's [known issues](https://docs.cloud.google.com/run/docs/known-issues) recommend avoiding paths ending in z. The app, Docker healthcheck and local HTTP/container scripts now use `/health`. Local auth, provider-error isolation and 256 MiB container checks passed; this corrected image was **not** uploaded or deployed. The completed single-image run remains pinned to source `5e709d648fc2ef0bc68eeb7258d1fd9a9741905c`.
