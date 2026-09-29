# Real provider qualification

Recorded 2026-09-29 after [PR #111](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/111)
was merged and released. This branch starts from released main
`64d02b581aedc2eb77a0b4d9357f515d17a41b24`. Provider qualification below distinguishes
code and local fixtures from actual upstream exchanges. No OpenGraph call,
Judge.me delivery, Stripe Identity session or Stripe Identity webhook was produced
in this exercise. None is classified TEST-SANDBOX EXERCISED.

## Secure configuration inspection

Existing Vercel Production and Preview metadata was inspected without printing
secret values. Neither environment lists OpenGraph or Judge.me credentials.
Production lists `STRIPE_SECRET_KEY` and `STRIPE_IDENTITY_WEBHOOK_SECRET`; Preview
lists neither. Vercel's ephemeral `env run` refuses export of sensitive Production
values, including those two. The local process and inspected local configuration
also provide no usable Stripe Identity credentials. Key mode, account capability,
webhook registration and successful delivery therefore remain unverified.

No secret extraction endpoint, secret downgrade, live-account session or synthetic
webhook was used to overcome this boundary. No hosted environment variables changed.
The Vercel CLI refreshed an ignored local `VERCEL_OIDC_TOKEN` during project setup.
Presence of a variable name is not evidence of a valid or sandbox-ready account.

OpenGraph needs an owner-authorized account/App ID securely provisioned to the
application and bound to its tenant. Its [authentication contract](https://www.opengraph.io/docs/concepts/auth)
and [MCP header authentication](https://www.opengraph.io/docs/mcp/authentication)
do not establish the per-hop DNS, redirect and rendered-subresource confinement
required before enabling this executor. The existing boundary deliberately returns
NOT_CONFIGURED, including when a caller supplies an executor. Credential access
alone does not close that implementation gap.

Judge.me needs an authorized test store/installation, shop domain and private API
token, or an owner-approved OAuth application/store token with minimum required
scope. Its [API setup](https://judge.me/help/en/articles/8409180-using-judge-me-api)
and [webhook verification](https://judge.me/help/en/articles/8299679-verifying-webhooks-from-judge-me)
require the matching private-token or OAuth-app signing secret. Trusted installation,
tenant, subject and product/review mapping must precede ingestion. No installation
resolver or webhook route is enabled. Durable duplicate reservation, changed-payload
detection, failed-event retry and authenticated stale-event reconciliation still
need wiring and real delivery proof. A public widget token is insufficient.

Stripe needs an Identity-enabled owner-authorized test account, isolated nonproduction
tenant/data, a securely provisioned test API key and the matching own-account Identity
snapshot webhook secret for `/api/stripe/identity/webhook`. Create the session through
the authenticated Cyber Sentinels verification flow and complete Stripe's hosted
predefined test case so Stripe itself sends the signed event. Retain only safe
session/event/request references and normalized results. The earlier owner-reported
business/account blocker has not been independently cleared. See the updated
[Stripe qualification record](providers/STRIPE_IDENTITY_QUALIFICATION.md) for exact
local gaps and the safe test procedure. Test-mode verification is simulated identity
assurance even when the API exchange itself is real.

## Single canonical path

Principal → Agent/Human/Service Identity → Identity Evidence → contextual Identity
Corroboration → Authority → Delegation → Purpose → Target → Policy → Requested Action
→ ALLOW / REVIEW / DENY → Execution → External Effect → Destination Evidence → Actual
Outcome → Contradiction Detection → Receipt → Replay → Trust Memory.

All adapters contribute evidence or execute an independently authorized request.
There is no provider-specific authorization engine. Identity and identity integrity
do not grant authority; policy does not grant authority; provider ALLOW is not a
canonical ALLOW; provider success is not a verified destination outcome; ALLOW is not
execution success; REVIEW and DENY do not dispatch. In the `identity_signal_evidence`
collection path, signed test evidence cannot qualify an action in a different environment.

The new eligibility check uses existing identity evidence metadata, requires exact
known environment equality, and runs before newest-per-provider selection. It does
not rewrite historical evidence. Unknown/missing environment is ineligible. This
closes the demonstrated sandbox-to-Production identity-signal gap; it is not a claim
that every legacy or external evidence surface has completed environment qualification.

## Provider matrix

Bindings below describe implemented checks, not a claim that live configuration or
an upstream contract is qualified. **NO** in the bypass column means the provider
has no entitlement to replace canonical authority. N/A means that the listed role
does not itself establish that binding. Production history is explicitly labelled
where inherited rather than re-exercised here.

| Provider | Role | Authentication | Tenant binding | Subject binding | Target binding | Signature | Replay protection | Normalization | Canonical decision bypass | Real qualification | Production qualification | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenGraph | Governed web-data tool | App ID/account required; transport disabled | Canonical session context | Canonical actor/entity | Parsed HTTPS URL, exact URL/label-aware domain/tool scope | No response verifier | Canonical idempotency seam; no live attempt | Request/receipt only; response adapter absent | NO | BLOCKED_EXTERNAL; local boundary tested | NO | Credentials, gateway/transport wiring, DNS/redirect/rendering confinement, destination proof |
| Judge.me | Review evidence / future governed target | Private token or OAuth; not configured | Installation resolver absent | Local exact subject check; trusted mapping absent | Local exact installation/product/review checks | Raw-byte HMAC primitive; no live route | NOT WIRED; deterministic hash is not reservation | Bounded references/rating/status; INCONCLUSIVE, unverified | NO | BLOCKED_EXTERNAL; local helper tested | NO | Test install, credentials, tenant resolver, real signed delivery, durable retry/freshness/replay |
| Stripe Identity | Identity evidence | Server API key; Production name present, mode unknown | Stored verification request and session metadata | Stored subject plus authoritative session metadata | Exact VerificationSession/request ID; action authority separate | Stripe SDK raw-event verification plus current session fetch | Durable event reservation; completed duplicate protected; failed/processing recovery incomplete | Bounded verification flags/references/environment; no document/selfie payload retained | NO | BLOCKED_EXTERNAL; fixtures only | NO | Isolated test config/account, real hosted test completion and delivery; lifecycle/retry gaps |
| World ID | Personhood evidence | Configured RP request signing and server verification | Server context and durable nullifier claim | Server-resolved subject bound to claim | RP/action/environment checked | RP request signature plus server proof verification | Durable scoped nullifier claim | Bounded personhood/provenance fields | NO | Staging DB qualified historically; real human provider proof absent | NO | RP/action credentials and real human proof; database qualification is not provider exercise |
| Persona | Identity reference adapter | API Bearer retrieval helper; no configured credential found | Adapter context; installation/account binding incomplete | Exact inquiry reference-id check | Exact inquiry ID; action authority separate | No qualified webhook path | No qualified delivery path | Inquiry lifecycle only, LOW/PENDING; no invented document/liveness certainty | NO | ADAPTER ONLY | NO | Account/tenant/environment binding, verification mapping, signed callback/replay and real proof |
| Veriff | Identity/document reference adapter | Generic API-key placeholder | No live binding | Adapter input only | No live session binding | Not implemented | Not implemented | Generic unavailable/not_implemented result | NO | ADAPTER ONLY | NO | Endpoint-specific session/callback implementation and credentials |
| Turnstile | Anti-abuse signal for public/auth flows | Secret server Siteverify; configured names present | Public/auth request context; not enterprise identity | Token does not establish person identity | Exact expected hostname; no action claim asserted by this audit | Server Siteverify response; not webhook signature | Provider token semantics; no local evidence ledger | Bounded success/error/hostname/time | NO | Historical Production exercise; no new challenge completed here | Historical YES; current public smoke only | Retain fresh successful challenge proof for each protected flow |
| OpenAI shadow | Optional advisory analysis | Server Bearer key; no configured name found | Calling workflow context; not model-enforced | Input context only | Advisory request/schema; no execution entitlement | HTTPS API response, not signed destination proof | No provider webhook/replay qualification | Structured JSON; store:false; bounded response and timeout | NO | NOT CONFIGURED | NO | Authorized data handling, key and actual advisory exchange; model advice cannot authorize |
| CrowdStrike adapter | Potential workload/runtime evidence | No native authentication integration | Unqualified provider-neutral reference only | Reference only | No native target/executor | No native verifier | No native ingestion | Compatibility references only | NO | ADAPTER ONLY | NO | Required workflow, authenticated adapter and provider/destination proof |
| Hopae Connect | Identity evidence | Client credentials and provider ID required; only issuer/base/environment/enabled metadata found | Owned workflow/execution and callback context | Entity/session relationship checks | Verification session and workflow | Timestamped HMAC and authoritative provider lookup in existing adapter | Existing callback/event reservation; real retry proof absent | Bounded eID/session evidence | NO | NOT CONFIGURED; local adapter tested | NO | Client ID/secret, provider ID, webhook secret, approved target and real exchange |
| Stripe Billing | Billing infrastructure, not Identity | Server Stripe key; billing client rejects live mode | Billing customer/workspace association | Customer membership, not identity verification | Checkout/subscription references | Separate billing webhook secret and signature path | Existing billing event handling; no new live retry proof | Billing/subscription state, not action authority | NO | IMPLEMENTED NOT EXERCISED in retained record | No new qualification | Real test-account checkout/webhook proof; does not qualify Identity |
| Supabase Auth/database | Authentication and tenant persistence | Existing server/session credentials | RLS and authenticated tenant context | Authenticated user and stored ownership | Scoped rows/RPCs | Auth token verification; not external business outcome signature | Transaction constraints/idempotency where implemented | Existing canonical/evidence/receipt records | NO | PRODUCTION EXERCISED | Current migration/catalog/lint verified; public auth smoke | Authenticated owner flow and restore drill are separate retained limitations |

Sources: [OpenGraph/Judge.me detailed cases](PROVIDER_EXECUTION_QUALIFICATION.md),
[provider inventory](V2_PROVIDER_READINESS.md), [World ID verifier](../lib/providers/world-id-verifier.ts),
[identity clients](../lib/identity-signals/runtime.ts), [Turnstile verifier](../lib/bot-protection.ts),
[Hopae configuration](../lib/providers/adapters/hopae/hopae-config.ts),
[OpenAI transport](../lib/ai/openai.ts). Other detection names remain unconfigured
reference adapters; none was silently promoted to an active integration.

## Evidence and remaining boundary

[Identity corroboration qualification](IDENTITY_CORROBORATION_QUALIFICATION.md)
uses existing Evidence Graph and Trust Memory. [Controlled outcome qualification](CONTROLLED_PROVIDER_OUTCOME_QUALIFICATION.md)
covers the six requested local cases and states exactly which boundaries are fixtures.
No real provider receipt, complete hosted outcome chain, independent live destination
evidence or post-outcome durable Replay/Trust Memory proof was manufactured.

New tables, migrations, API scopes and dependencies on this branch: **0**.
The existing four-function SQL repair belongs to released PR #111.
Automatic Vercel deployment is disabled for this qualification branch; its changes
require separate review and release.

## Branch validation

Focused provider, environment, corroboration, outcome and SQL regression suite:
**192 passed, 0 failed, 0 skipped**. Complete `npm test`: **1,911 passed, 0 failed,
0 skipped**. ESLint, TypeScript, Production build and scoped secret scan passed.
Hosted Production database lint passed again with `results: []`. The static audit
scanned 118 migrations with zero errors and 85 existing warnings; this branch
changes no migration. Local documentation links and `git diff --check` passed.

The initial full run exposed a Windows checkout regression in the SQL test: the
expected function body normalized CRLF, but the actual body did not. The comparison
now normalizes both sides identically while retaining exact SQL token/repair,
privilege and schema assertions. Actual migration execution is unchanged. The
focused regression and complete suite passed after that test-only correction.

The new environment eligibility tests run with the existing canonical suite;
corroboration and the six controlled outcome cases are included in `npm test`.
These results do not change the real-provider classifications above.
