# Azure subscription and cost review

Evidence date: 24 October 2026. All demonstration data is synthetic. Portfolio project, not an employer integration. **Account review performed; deployment NOT VERIFIED and NOT APPROVED.**

## Actual checks

The owner created an Azure Free account and requested subscription/cost checks. Azure CLI 2.91.0 browser authentication completed. Its selected subscription matched the signed-in portal. A saved portal subscription filter hid the subscription; changing the view to all subscriptions revealed it. No access policy was changed.

Read-only ARM checks at 14:49:56 UTC returned:

| Check                             | Observed result                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Subscription                      | Enabled; quotaId FreeTrial_2014-09-01                                           |
| Credit-linked spending limit      | On                                                                              |
| UK South                          | Visible in subscription locations and Windows Dynamic/Consumption region list   |
| Storage availability              | Standard_LRS / StorageV2 has one UK South SKU match with no listed restrictions |
| Microsoft.Web / Microsoft.Storage | Both NotRegistered; left unchanged                                              |
| Subscription budgets              | Zero returned                                                                   |
| UK South App Service usage/quota  | HTTP 400; quota NOT VERIFIED                                                    |
| Credit lots                       | HTTP 404; remaining balance and exact expiry NOT VERIFIED                       |
| Month-to-date ActualCost query    | HTTP 404, unsupported offer response; cost NOT VERIFIED                         |

Regional listings are capability evidence, not proof of allocatable quota or successful deployment. The reason for the quota failure is unconfirmed. Portal billing observations and identifiers are retained privately; unavailable cost data is never converted into zero. The public projection is [azure-account-preflight.json](evidence/azure-account-preflight.json). Raw operator responses remain outside the repository.

## Cost decision

Retain the verified Free Trial spending limit. Continue with the existing Windows Consumption polling-trigger design because it fits the locally tested reconciliation flow. Functions execution grants do not make Blob/Queue/host/content/package storage free. No Premium, Always Ready, managed SQL, Marketplace purchase or support purchase is included.

**HOLD before provisioning:** obtain actual credit balance/expiry, retry the quota review, settle identity-based package/content storage, review complete storage/Functions costs and dependency findings, then prepare an exact bounded deployment/test/teardown proposal for explicit owner approval. No numeric usage-cost estimate or £0 guarantee is established yet. No providers were registered, resources created, plan upgraded, spending limit removed or budget configured.

Microsoft documents that new credits can take up to 24 hours to appear. Recheck billing after that interval; do not infer an entitlement from the advertised US$200 offer. The free-service benefit end date is distinct from trial-credit expiry. A budget alert, if later configured, would be a warning rather than a hard cap.

## Deployment readiness notes

The current Bicep compiles locally, but Windows Consumption code/content deployment is not yet finalised. Microsoft documents a no-Azure-Files option using a private Blob package URL and managed identity, with trigger synchronisation and scaling considerations. Resolve this deliberately before asking for deployment approval; do not infer that successful Bicep compilation proves a working hosted function. Changing to Flex would also require review of the existing polling trigger.

The refreshed production dependency audit reports zero high/critical and one moderate uuid advisory through @azure/identity 4.13.0 -> @azure/msal-node 3.8.10 -> uuid 8.3.2. The installed MSAL bundle imports uuid and calls only uuid.v4(); the advisory identifies v4 as unaffected. This is a bounded reachability assessment of that caller, not a clean-audit or zero-risk claim. No major-version override was applied. Reassess before deployment.

## Sources checked on the evidence date

- [Subscription policies API](https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/get?view=rest-resources-2022-12-01)
- [Spending-limit behaviour](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)
- [Credit balance and portal propagation](https://learn.microsoft.com/en-us/azure/cost-management-billing/benefits/credits/mca-check-azure-credits-balance)
- [Functions pricing](https://azure.microsoft.com/en-gb/pricing/details/functions/) and [Blob pricing](https://azure.microsoft.com/en-gb/pricing/details/storage/blobs/)
- [Functions storage considerations](https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations)
- [Blob trigger implementations](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger)
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

CV boundary: account/cost governance evidence supplements the locally tested pipeline. It does not support an Azure cloud deployment claim.
