# Azure package and storage configuration

All demonstration data is synthetic. Portfolio project, not an employer integration. Evidence date: 24 October 2026. **Locally configured and tested; no Azure deployment approved or performed.**

## Selected design

Windows Consumption Y1, Functions v4/Node 22 and the existing polling Blob trigger are retained. One dedicated StorageV2 Standard_LRS Hot account holds host Blob/Queue state and private incoming, results and packages containers. Shared Key and anonymous Blob access are disabled. There is no Azure Files share or content connection string.

The app fetches a content-addressed private ZIP through a dedicated user-assigned managed identity. This replaces the earlier system-assigned identity proposal: a separate identity allows storage role assignments before the app's first package fetch, and makes the package, host, binding and SDK identity explicit. It adds one identity resource to the future approval scope. RBAC propagation can still require a wait/restart; a successful role-assignment deployment is not proof that data-plane access is ready.

Runtime has storage-account-scoped Blob Data Owner, Queue Data Contributor and Storage Account Contributor for identity-based host storage and the Blob trigger. Blob Data Owner also supplies package read permission; no additional redundant Reader role is added. These permissions are broad within the single dedicated demo account, not subscription-wide. They do not establish production least privilege. The operator receives Blob Data Contributor only on that account, since subscription Owner does not itself grant Entra Blob data access. All assignments are part of the future approval scope.

## Local package build

Prerequisites: pnpm, npm, Python 3.10+, and a clean staging directory. No cloud command is run by these helpers.

```powershell
pnpm build
pnpm package:azure
Push-Location work/azure-package
npm ci --omit=dev --ignore-scripts
Pop-Location
python scripts/package-azure.py
python scripts/check-azure-package.py
```

The checked-in runtime package/lock fixes @azure/functions 4.17.0, @azure/functions-extensions-base 0.3.0 and cookie 0.7.2. Azure identity/storage code is bundled by esbuild. ZIP roots are function.cjs, host.json, package.json, package-lock.json and installed node_modules. Unexpected roots (including local.settings.json), symlinks, missing/mismatched locked dependencies and native binaries fail packaging. ZIP timestamps, ordering and permissions are normalised. Fixed content produces the same bytes; the SHA-256 supplies the blob name. The inventory manifest is outside the ZIP and records dirty-source state honestly.

Actual artifact: 899,205 bytes compressed, 4,641,170 uncompressed, 122 file entries. SHA-256: `14db53498b7be1ecafdaf30240303dc11628fee500ba7ce06c2b91720cc80d63`. The ZIP is in ignored local work/; no credentials or package URL were uploaded. A second build matched byte-for-byte and a synthetic local.settings.json probe was rejected and removed.

The exact ZIP was extracted and mounted read-only over /home/site/wwwroot in the existing local Functions v4/Node 22 image, using Azurite. The host detected a new CRM blob and wrote the expected 48-record/12-finding report. Evidence: [actual ZIP-host result](evidence/azure-package-host.json). Invocation `2c64f4f8-e094-4da2-8d74-90dd9ae23160` succeeded in 284 ms. This Linux host/emulator test does not verify Windows hosting, managed identity or private-URL package fetch in Azure. Local npm ran under Node 24 and emitted the expected Node 22 engine warning; actual host execution used Node 22.

## Deployment order — execute only after cost gates and explicit approval

1. Recheck FreeTrial/Enabled/spending limit On, actual credit balance/expiry and regional quota. Review/register only approved providers. Microsoft.Web registration alone was separately approved; it authorises no resources. Microsoft.Storage and Microsoft.ManagedIdentity registration are not yet approved.
2. Compile both storage.bicep and main.bicep; both compiled with Bicep 0.48.1. Review a dedicated group, operator object ID, tags and resource inventory. No group, validation deployment or what-if was run in Azure.
3. After approval, create only the dedicated group and deploy storage.bicep with prefix, location and operatorPrincipalId. It creates the account, Blob service, three private containers and scoped operator role. Do not use keys or connection strings. Wait for Entra data access to propagate.
4. Read work/azure-package-manifest.json. Upload its ZIP to packages using `az storage blob upload --auth-mode login --overwrite false`, with the manifest's exact filename. Download it with Entra authentication and independently compare SHA-256 before application deployment. A different hash requires a different blob name and review.
5. Deploy main.bicep with prefix, location, storageAccountName and packageSha256. It creates Y1 plan, identity, three scoped runtime assignments and function app. The app depends on role assignments. WEBSITE_RUN_FROM_PACKAGE points to the private blob; WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID, AZURE_CLIENT_ID and host/binding client IDs select the same identity. No SAS, remote build or zip-push-to-Azure-Files is used. Scale limit is one.
6. Allow RBAC propagation; restart if needed, then synchronise triggers through the authenticated ARM `.../sites/<function>/syncfunctiontriggers?api-version=2023-12-01` POST. Verify function discovery before uploading data. If package access/startup fails, stop and diagnose; never enable anonymous access or Shared Key as a shortcut. For updates use a new hash URL, restart and sync.
7. Perform a bounded synthetic batch, retry, missing-source and malformed-source tests. Reread persisted report hashes/ETags/counts and poison queues; verify unsigned Blob writes fail. Keep source evidence and cloud evidence separate. Live invocation telemetry needs a deliberate observability review: no Application Insights/Log Analytics resources are currently included, and no streaming-log capability is claimed without Azure Files.
8. Delete the dedicated group in the approved session; independently verify absence of account, plan, app, identity and assignments. Retain the operator evidence outside public source and recheck delayed billing. Provider registration is subscription setup and is not removed by resource-group teardown.

Microsoft documents [running without Azure Files](https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations#create-an-app-without-azure-files), [external package URLs and managed identity](https://learn.microsoft.com/en-us/azure/azure-functions/deployment-zip-push#run-from-an-external-package-url), and [identity-based host storage](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference#common-properties-for-identity-based-connections). Dynamic scale-out can be limited without Azure Files; this bounded one-instance demonstration does not claim high scale.
