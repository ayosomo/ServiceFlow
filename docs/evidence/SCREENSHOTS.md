# Screenshot provenance

All demonstration data is synthetic. Portfolio project, not an employer integration.

These are **actual local browser captures of saved execution evidence**, created during the Phase 4 review on 24 October 2026. They are deliberately labelled as saved-record views. They are not screenshots of an original cloud console, fresh provider tests or a product UI. Selected fields improve readability; the linked raw records retain full context, failures and exact boundaries.

| Image | What is shown | Underlying actual evidence |
| --- | --- | --- |
| [AWS local HTTP](screenshots/aws-local-evidence.png) | Create 201, requester denial 403 and unchanged version/audit, approver/replay 200, stale conflict 409 and final two-event reread | [Dated loopback responses](phase4-http-responses.txt); in-memory persistence, not IAM/cloud verification |
| [Azure local host](screenshots/azure-local-evidence.png) | Saved exact-package Functions host report: 48 records, 12 findings, source/package identity and metric exclusions | [Actual local Functions/Azurite package run](azure-package-host.json); Azure cloud NOT VERIFIED |
| [GCP historical cloud](screenshots/gcp-cloud-evidence.png) | Actual deployed source/revision, metrics, failed health route and independently observed cleanup | [Saved provider/test projection](gcp-cloud-verification.json); business APIs verified, correction not redeployed |

[Source-record hashes and view generation](screenshots/sources.json) and [actual screenshot UTC timestamps, image SHA-256 and sizes](screenshots/captures.json) are machine-readable. The static HTML files beside each PNG contain the exact displayed selected fields and source hashes. No tokens, financial balances or account IDs are included.

## Reproduce the visual layer

Run `pnpm exec tsx scripts/render-portfolio-evidence.ts` against the saved records. Open the generated local HTML in a browser, or use an existing Chromium/Edge headless executable with `--headless --disable-gpu --hide-scrollbars --window-size=1440,1900 --screenshot=<output.png> <local-file-URL>`. Use a separate scratch browser profile and no cloud credentials. The actual capture used installed Microsoft Edge with a fresh task-local profile, no extensions and no external page assets. This does not require cloud deployment or a paid service.

Visual QA checked all three images for readable text, visible status limitations, source hash footers and clipped content. Re-rendering a saved record does not rerun its original cloud/host test. Owner case-study acceptance is recorded separately and remains pending.

## Archive correction after the initial Phase 4 tag

The v0.4.0 archive check caught a mismatch between the local CRLF bytes of the saved GCP JSON and Git's canonical LF bytes. JSON values and cloud results were identical; the displayed source hash was not portable. The working record was normalised to the already published Git bytes, the source manifest/GCP view was regenerated and its browser screenshot recaptured. The earlier tag remains historical; use the v0.4.1 correction. `pnpm check:portfolio` now verifies source/image hashes in CI, and a deliberately corrupted-hash probe must fail. [Failure and correction evidence](phase4-archive-correction.json). No provider call, application redeployment or result replacement occurred.
