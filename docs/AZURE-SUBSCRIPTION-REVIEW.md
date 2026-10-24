# Azure subscription and cost review

Evidence date: 24 October 2026. All demonstration data is synthetic. Portfolio project, not an employer integration. **Account review performed; deployment NOT VERIFIED and NOT APPROVED.**

## Actual checks

The owner created an Azure Free account and requested subscription/cost checks. Azure CLI 2.91.0 browser authentication completed. Its selected subscription matched the signed-in portal. A saved portal subscription filter hid the subscription; changing the view to all subscriptions revealed it. No access policy was changed.

Initial read-only ARM checks at 14:49:56 UTC were repeated at 15:01 UTC. The owner subsequently explicitly approved registering Microsoft.Web only. Registration completed and the UK South quota was read at 15:12:16 UTC:

| Check                             | Observed result                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Subscription                      | Enabled; quotaId FreeTrial_2014-09-01                                                    |
| Credit-linked spending limit      | On                                                                                       |
| UK South                          | Visible in subscription locations and Windows Dynamic/Consumption region list            |
| Storage availability              | Standard_LRS / StorageV2 has one UK South SKU match with no listed restrictions          |
| Microsoft.Web / Microsoft.Storage | Web Registered with explicit approval; Storage still NotRegistered                       |
| Subscription budgets              | Zero returned                                                                            |
| UK South App Service usage/quota  | HTTP 200 after registration: Y1 current 0 / limit 0 Instances                            |
| Credit lots                       | HTTP 404; remaining balance unverified; initial FreeAccount limit/end privately verified |
| Month-to-date ActualCost query    | Latest billing-profile query HTTP 200, zero rows; measured final cost NOT VERIFIED       |

Regional listings are capability evidence, not proof of allocatable quota or successful deployment. The newer API identified missing provider registration as the likely cause of its initial failure; the approved registration resolved API access. The returned zero Y1 limit is a deployment blocker, not evidence of usable capacity. Portal billing observations and identifiers are retained privately; unavailable cost data is never converted into zero. The public projection is [azure-account-preflight.json](evidence/azure-account-preflight.json). Raw operator responses remain outside the repository.

## Cost decision

Retain the verified Free Trial spending limit. Continue with the existing Windows Consumption polling-trigger design because it fits the locally tested reconciliation flow. Functions execution grants do not make Blob/Queue/host/content/package storage free. No Premium, Always Ready, managed SQL, Marketplace purchase or support purchase is included.

**HOLD before provisioning:** obtain the remaining credit balance, seek trial/account clarification for zero Y1 entitlement without upgrading, review the completed identity-based package/content storage configuration and cost scenario, reassess dependency findings, then prepare an exact bounded deployment/test/teardown proposal for explicit owner approval. The [retail-cost scenario](evidence/azure-retail-cost-scenario.json) is approximately US$0.86 gross before grants/credits under explicit assumptions, not actual spend, a cap or a £0 guarantee. Only Microsoft.Web was registered with owner approval. No resources were provisioned, plan upgraded, spending limit removed or budget configured.

Microsoft documents that new credits can take up to 24 hours to appear. Recheck billing after that interval; do not infer an entitlement from the advertised US$200 offer. The free-service benefit end date is distinct from trial-credit expiry. A budget alert, if later configured, would be a warning rather than a hard cap.

## Deployment readiness notes

The [storage/package configuration](AZURE-PACKAGE-AND-STORAGE.md) is now complete locally: separate storage bootstrap, private content-addressed Blob package, dedicated user-assigned identity and scoped runtime/operator roles, no Azure Files or Shared Key, explicit one-instance scale setting and manual trigger synchronisation. Both templates compile; the reproducible ZIP passed an actual local Functions v4/Node 22 host smoke with Azurite. Azure managed-identity startup, private package fetch, resource-level what-if and live trigger tests remain unverified. The no-Azure-Files scaling/log-streaming limitations and future observability review are recorded. Changing to Flex would require a deliberate trigger/cost review.

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

## No-upgrade diagnosis follow-up

The next read-only review confirmed billing-account/profile read access and an Active FreeAccount initial limit with a precise start/end period, recorded privately. The remaining balance is still unavailable; initial amount is not remaining credit. Cost-query access now works (HTTP 200 with no rows). Ten regions were checked without finding verified usable Y1 capacity; absent Y1 entries remain unknown. See [findings, policy and owner route](AZURE-NO-UPGRADE-OPTIONS.md) and [selected-field evidence](evidence/azure-trial-unblock.json).

Microsoft's published policy excludes Free Trial subscriptions from quota increases. The owner has an unsent private Billing / Subscription management support draft requesting trial activation/credit/default-entitlement clarification. No paid support, plan upgrade, quota request or support submission was performed. Deployment stays on hold.
