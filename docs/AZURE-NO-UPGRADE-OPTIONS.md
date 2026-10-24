# Azure trial diagnosis without upgrading

All demonstration data is synthetic. Portfolio project, not an employer integration. Evidence date: 24 October 2026; later same-day recheck below supersedes the earlier missing-credit result. **Read-only checks only; no new account changes, support submission or deployment.**

## What the checks established

- Subscription remains Enabled / FreeTrial_2014-09-01 with spending limit On; Microsoft.Web is Registered.
- Billing-account, billing-profile and billing-permission GETs return HTTP 200. Both billing scopes report hasReadAccess=true, and the selected subscription is present in that billing account. Basic sign-in/read access is working.
- Billing profile spendingLimitDetails identifies an Active FreeAccount item with an initial amount and precise start/end dates, verified privately. This resolves the initial entitlement/period uncertainty. It is **not a remaining-credit-balance field**: Microsoft defines amount as the initial amount and endDate as when that spending limit stops applying.
- The later credit-summary and credit-lots reads now return HTTP 200. Current promotional balance and direct credit-lot expiry are verified privately, and the lot matches the summary. The earlier DAS discovery 404 has resolved; no account change was performed and its cause is unconfirmed. The billing-currency figure is explicitly an estimate, distinct from current credit currency.
- The billing-profile ActualCost query now succeeds (HTTP 200) and returns no rows. The prior throttling was not present at this check; empty usage data is not independently measured zero final spend.
- No resources or resource groups exist. No plan/region switch, quota request, provider registration or resource creation occurred in this review.

Latest selected-field evidence: [azure-free-recheck.json](evidence/azure-free-recheck.json); earlier 404 history is retained in [azure-trial-unblock.json](evidence/azure-trial-unblock.json). Personal identifiers, financial values and account dates are outside this public repository.

## Regional alternatives checked

All ten regional usage queries returned HTTP 200. Every checked regional-total limit was 0.

| Regions                                                               | Y1 result                            |
| --------------------------------------------------------------------- | ------------------------------------ |
| UK South, North Europe, East US, East US 2, West US 2, Canada Central | Explicit Y1 current 0 / limit 0      |
| UK West, West Europe, Sweden Central, Central India                   | Y1 entry absent; capacity unverified |

No usable alternative Y1 allocation was established. An absent SKU entry is neither a confirmed zero nor a usable allocation. These checks do not establish that every Azure region is unavailable. No deployment was attempted as a test.

## Supported next route

Microsoft explicitly states that **Free Trial subscriptions are not eligible for limit or quota increases**. A normal increase request is therefore not a reliable no-upgrade route. Billing and subscription-management support are included in Basic support; a paid technical support plan is unnecessary for an account/trial entitlement investigation.

The credit visibility gate is now resolved; waiting until the earlier 24-hour recheck point is no longer necessary for the API balance. The owner has an updated unsent support draft focused on Y1. Open or update an included Billing / Subscription management case to ask whether zero/missing Y1 is an intentional offer restriction or an activation/default-allocation issue that can be corrected without conversion. Do not promise that support will enable Y1 or grant an exception to the published policy.

Keep Free Trial and the spending limit. If Microsoft confirms that using Y1 requires a paid upgrade, preserve the locally verified Functions/Azurite lab and its honest cloud NOT VERIFIED status. Do not purchase Premium/Always Ready, create another trial to evade eligibility, or change hosting plans as an unreviewed workaround. Any later viable region/architecture still needs a fresh cost review and explicit deployment approval.

## Sources checked

- [Quota policy](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#how-to-manage-limits)
- [Billing-profile field definitions](https://learn.microsoft.com/en-us/rest/api/billing/billing-profiles/get?view=rest-billing-2024-04-01)
- [Credit visibility and up-to-24-hour delay](https://learn.microsoft.com/en-us/azure/cost-management-billing/benefits/credits/mca-check-azure-credits-balance)
- [Basic support inclusion](https://azure.microsoft.com/en-us/support/plans/)
- [Portal support-request steps](https://learn.microsoft.com/en-us/azure/azure-portal/supportability/how-to-create-azure-support-request)

## Support access and owner handoff

A fresh UK South response with request/correlation IDs was captured privately for Microsoft. Microsoft.Support is already Registered, and the permissions listing indicates support-ticket write via a wildcard. However, the actual ticket-list GET returned HTTP 403 Forbidden; that listing does not prove successful support access, and no existing-case count is inferred. The owner should check existing requests in the portal, choose included Billing / Subscription management support and submit the prepared draft/contact details themselves. No case, quota request, provider registration, plan change or resource was created in this review. A paid technical support plan is unnecessary for that category.

Credit recovery removes one blocker; it does not change the Y1 results or authorise deployment. Six regions still explicitly return Y1 0/0, four omit it, and no usable allocation was verified. If Microsoft confirms paid conversion is required, retain the local Functions/Azurite lab. Do not deploy as a quota probe or change the hosting architecture as an unreviewed workaround.

Microsoft's support-plan comparison excludes Support API access from Basic while including billing/subscription support. That may explain the API 403, but its cause is not proven. Use the portal's included billing/subscription route; do not purchase support to make this diagnostic API work.
