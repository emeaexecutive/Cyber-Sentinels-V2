# Cyber Sentinels V1 closure qualification

Date: 2026-09-04

This record separates implemented capability from configured or exercised provider service. A provider result is evidence input only. It cannot grant authority or choose a canonical `ALLOW`, `REVIEW`, or `DENY` result.

## Provider-neutral identity boundary

`IDENTITY PROVIDER -> PROVIDER EVIDENCE -> NORMALIZATION -> CYBER SENTINELS EVIDENCE -> IDENTITY / AGENT PASSPORT -> ACCOUNTABLE PRINCIPAL -> AUTHORITY -> POLICY -> ACTION -> ALLOW / REVIEW / DENY`

Identity verification and action authorization are independent checks. External identity, security, model, or outcome providers never own Cyber Sentinels authority.

## Provider qualification matrix

| Provider | Purpose | Configuration | Runtime and callback security | Normalization, persistence, and binding | Production state | Decision eligibility |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase | Primary database, tenant-scoped persistence, and user authentication | Production project `kecgtsfibkypjuaxqbjx` is bound through server-side Vercel variables | SSR auth, service-role-only server repositories, PKCE recovery, RLS, and scoped RPCs | Canonical transaction, evidence, authority, receipt, Replay, Trust Memory, and provider tables | **PRODUCTION EXERCISED** | Stores canonical inputs and results; authentication alone grants no action authority |
| Cloudflare Turnstile | Human-verification gate for public auth and request surfaces | Production site and secret keys are configured; official test keys are rejected in Production | Siteverify is server-side; invalid, replayed, unavailable, or hostname-mismatched verification fails closed | A gate result permits request processing but is not identity or authority evidence for an external agent action | **PRODUCTION EXERCISED** | Not decision-eligible provider evidence |
| Hopae Connect | Independent upstream identity verification | Adapter expects enablement, environment, client ID, client secret, webhook secret, provider ID, and bounded callback/redirect values; required Production values are absent | Session creation, exact raw-body HMAC, timestamp freshness, duplicate protection, status refetch, and user-info retrieval are implemented and contract-tested | Normalized identity evidence includes source digest, tenant/workspace, subject/workflow, provider transaction, receipt, Replay, and Trust Memory references | **NOT CONFIGURED** | Eligible only after a signed callback, server refetch, successful normalization, current evidence checks, and canonical subject/tenant binding; no Production record currently qualifies |
| World ID | Proof-of-personhood input | No working server-exchange configuration | Authenticated route validates only proof shape and returns `501` / `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED` | Safe adapter emits inconclusive zero-confidence evidence; no verified provider persistence | **ADAPTER ONLY** | Not decision-eligible |
| Stripe Billing | Checkout, portal, subscription, and usage-plan persistence | Production contains a Stripe secret name, but the implementation deliberately rejects live keys and required price/webhook configuration is incomplete | Billing webhook/return behavior is separate from identity; no live Production billing execution was qualified | Billing customer/subscription/usage tables only | **NOT CONFIGURED** | Never identity or action-authority evidence |
| Stripe Identity | Identity-document verification source | No session or provider verification configuration | Reference/detection adapter only; no server verification or signed callback lifecycle | Can represent a provider identifier, but cannot persist verified identity evidence from a live exchange | **ADAPTER ONLY** | Not decision-eligible |
| OpenAI | Optional assistive governance analysis | No Production `OPENAI_API_KEY` | Server-side Responses API client uses a timeout, structured JSON schema, and `store: false`; no canonical decision delegation | Optional analysis is not a persisted independent authority grant | **NOT CONFIGURED** | Never the canonical decision maker |
| CrowdStrike | Potential external workload/agent identity or runtime-security evidence | No native configuration | No native CrowdStrike adapter, OAuth flow, callback, or signature verifier | Provider-neutral references can preserve attributable CrowdStrike-shaped evidence only after a future verified adapter supplies it | **ADAPTER ONLY** | Not decision-eligible today |
| Okta / Microsoft Entra / Ping | Potential external identity evidence | No native configuration | No native runtime integration | Fits the provider-neutral external-identity contract | **NOT BUILT** | Not decision-eligible today |
| Persona / Entrust / Onfido / Veriff | Potential identity/document evidence | Credentials absent | Placeholder/detection adapters deliberately make no network call; credentials alone do not activate them | Awaiting-credentials or inconclusive normalization only; no verified Production evidence | **ADAPTER ONLY** | Not decision-eligible |
| Fingerprint/device, email, phone, IP reputation, network anonymity, geolocation | Contextual identity and risk signals | External providers are absent; bounded native device hashing may be configured separately | Client-reported device context is explicitly non-verifying; other adapters are disabled | Context can be retained with limitations but cannot self-upgrade to independent proof | **ADAPTER ONLY** | Context-only; not positive independent identity proof |
| Reality Defender / Sensity / Pindrop / C2PA / SynthID / document forensics | Potential media provenance, synthetic-media, and voice/document signals | Production credentials and live implementations are absent | Detection factory refuses to treat credentials as a working integration and returns `not_implemented` | Validation result contract only; no qualified external Production evidence path | **ADAPTER ONLY** | Not decision-eligible today |
| Synthetic staging provider | Deterministic provider-evidence qualification in isolated staging | Explicit staging-only enablement and project pin are required | Refuses every Production boundary and rejects unpinned projects | Produces deterministic test evidence for contract qualification only | **TEST/SANDBOX EXERCISED** | Never Production evidence |

## V1 capability truth matrix

| Classification | Capabilities |
| --- | --- |
| **WORKING** | Public V1 API; scoped and hashed API keys; agent registration; Ed25519 challenge/proof; Agent Passport projection; native identity evidence; authority grant/read/revocation; consequence-time policy evaluation; `ALLOW` / `REVIEW` / `DENY`; review resolution; canonical transactions; Evidence Graph; receipt; Replay; Trust Memory; tenant isolation; RLS; rate limiting; idempotency; Operations and decision-detail UI; developer documentation; provider-health reporting; pilot metric contract/service/demo scorecard; whitepaper publication |
| **PARTIAL** | Continuous Trust until the canonical alert migration is applied and requalified in Production; provider settings across a mixed live/adapter inventory; billing surfaces without a qualified live Stripe lifecycle; compliance/report generation where outputs remain operational evidence rather than external certification |
| **ROADMAP** | Additional independently qualified identity/runtime providers; live customer pilot measurement; advanced cross-provider anomaly intelligence |
| **NOT BUILT** | Native CrowdStrike, Okta, Microsoft Entra, or Ping integration; World ID server verification; Stripe Identity verification lifecycle; Agentic IdP |
| **BROKEN** | No unresolved V1 code defect after the qualification gates; Production qualification remains conditional until the exact release build and Continuous Trust migration are deployed and proven |

## Closure constraints

- The Pilot scorecard is demo-only and reports no live customer measurement.
- No sample, placeholder, or synthetic provider result is represented as Production evidence.
- A missing, stale, invalid, unavailable, or unqualified provider result must yield the policy-defined `REVIEW` or `DENY`; it must never be forced to `ALLOW`.
- CrowdStrike positioning: "Identity providers establish the agent. Cyber Sentinels proves the accountable authority behind what that agent does."
