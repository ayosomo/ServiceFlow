# Azure trial diagnosis without upgrading

All demonstration data is synthetic. Portfolio project, not an employer integration. Evidence date: 24 October 2026. **Read-only checks only; no new account changes, support submission or deployment.**

## What the checks established

- Subscription remains Enabled / FreeTrial_2014-09-01 with spending limit On; Microsoft.Web is Registered.
- Billing-account, billing-profile and billing-permission GETs return HTTP 200. Both billing scopes report hasReadAccess=true, and the selected subscription is present in that billing account. Basic sign-in/read access is working.
- Billing profile spendingLimitDetails identifies an Active FreeAccount item with an initial amount and precise start/end dates, verified privately. This resolves the initial entitlement/period uncertainty. It is **not a remaining-credit-balance field**: Microsoft defines amount as the initial amount and endDate as when that spending limit stops applying.
- The credit-summary and credit-lots endpoints still return HTTP 404 with DAS discovery NotFound. This does not establish a zero balance or prove entitlement failure. Its cause remains unconfirmed.
- The billing-profile ActualCost query now succeeds (HTTP 200) and returns no rows. The prior throttling was not present at this check; empty usage data is not independently measured zero final spend.
- No resources or resource groups exist. No plan/region switch, quota request, provider registration or resource creation occurred in this review.

Actual selected-field evidence: [azure-trial-unblock.json](evidence/azure-trial-unblock.json). Personal identifiers, financial values and account dates are outside this public repository.

## Regional alternatives checked

All ten regional usage queries returned HTTP 200. Every checked regional-total limit was 0.

| Regions                                                               | Y1 result                            |
| --------------------------------------------------------------------- | ------------------------------------ |
| UK South, North Europe, East US, East US 2, West US 2, Canada Central | Explicit Y1 current 0 / limit 0      |
| UK West, West Europe, Sweden Central, Central India                   | Y1 entry absent; capacity unverified |

No usable alternative Y1 allocation was established. An absent SKU entry is neither a confirmed zero nor a usable allocation. These checks do not establish that every Azure region is unavailable. No deployment was attempted as a test.

## Supported next route

Microsoft explicitly states that **Free Trial subscriptions are not eligible for limit or quota increases**. A normal increase request is therefore not a reliable no-upgrade route. Billing and subscription-management support are included in Basic support; a paid technical support plan is unnecessary for an account/trial entitlement investigation.

New credits can take up to 24 hours to appear. The owner has a private recheck time derived from the observed trial start, plus an unsent support draft. The owner can open a Billing / Subscription management case to ask Microsoft to confirm the active trial and credit balance, and clarify whether the zero/missing Y1 allocations are intentional restrictions or an account activation/allocation issue. Do not promise that support will enable Y1 or grant an exception to the published policy.

Keep Free Trial and the spending limit. If Microsoft confirms that using Y1 requires a paid upgrade, preserve the locally verified Functions/Azurite lab and its honest cloud NOT VERIFIED status. Do not purchase Premium/Always Ready, create another trial to evade eligibility, or change hosting plans as an unreviewed workaround. Any later viable region/architecture still needs a fresh cost review and explicit deployment approval.

## Sources checked

- [Quota policy](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#how-to-manage-limits)
- [Billing-profile field definitions](https://learn.microsoft.com/en-us/rest/api/billing/billing-profiles/get?view=rest-billing-2024-04-01)
- [Credit visibility and up-to-24-hour delay](https://learn.microsoft.com/en-us/azure/cost-management-billing/benefits/credits/mca-check-azure-credits-balance)
- [Basic support inclusion](https://azure.microsoft.com/en-us/support/plans/)
- [Portal support-request steps](https://learn.microsoft.com/en-us/azure/azure-portal/supportability/how-to-create-azure-support-request)
