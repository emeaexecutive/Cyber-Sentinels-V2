# Cyber Sentinels — Pre-Seed Technical Diligence

Status as of 31 August 2026: **not yet Production-proven**. The exact V1 candidate is comprehensively qualified in Staging. Production recovery, migration rehearsal, secrets, and hosted control-plane configuration are prepared, but the required supervised Turnstile and Auth/SMTP session has not yet been completed; the candidate has therefore not been merged or promoted.

## What is Cyber Sentinels?

Cyber Sentinels is operational trust infrastructure for software and AI agents. Its V1 API binds an agent identity, delegated authority, current evidence, policy, and transaction context to a canonical authorization decision. It preserves the decision and the evidence needed to explain what was known, permitted, reviewed, denied, or revoked at that moment.

## What does the API actually do?

An authenticated, tenant-bound API client can register an operational agent, attach verifiable evidence, read or administer tightly bounded authority, request a trust decision, route ambiguous cases to human review, record outcomes, and retrieve receipts and Replay history. API-key creation and rotation, rate limiting, idempotency, tenant/client ownership checks, and append-only evidence protections are part of the contract rather than separate operational conventions.

## What has been proven?

The exact candidate SHA `8e3f616d1ea5846bc59ed081ec2f13a7019b7372` passed CI and exact-SHA Staging deployment proof. Staging demonstrated API authentication, Customer Zero, agent identity, authority activation and revocation, ALLOW/REVIEW/DENY, review-to-fresh-ALLOW, post-revocation DENY, canonical transactions, receipts, Replay, Trust Memory, evidence provenance and attack rejection, atomic key rotation and old-key rejection, idempotency, tenant/client isolation, rate limiting, low-volume performance, and sanitized log inspection.

For Production, the migration divergence was semantically reconciled without discarding Production-only hardening. A fresh encrypted logical backup restored successfully into an isolated PostgreSQL instance. All required forward migrations then passed there, with RLS and Production ACL hardening retained. Required API secrets were created at Production scope, the environment is bound to the canonical domain and Production Supabase project, and Supabase Site URL, exact redirects, email-confirmation policy, JWT lifetime, and custom SMTP configuration were verified.

## Why does it matter for AI agents?

Identity alone answers “which agent is this?” It does not answer whether the agent may perform a particular action, against a particular target, for a particular purpose, under current conditions. Cyber Sentinels treats authority as a separate, versioned, revocable object and evaluates it with evidence at consequence time. That distinction is central when autonomous systems act faster than manual governance and when credentials, tools, destinations, or delegated context can change during a workflow.

## What is consequence-time authorization?

Consequence-time authorization is the decision immediately before an action has material effect. The system evaluates the agent identity, current authority and delegation lineage, requested action and target, evidence freshness, operational context, policy version, and any material change. A previously valid identity or old approval cannot silently substitute for current authority.

## What are ALLOW, REVIEW, and DENY?

`ALLOW` means the evidence and authority satisfy the bounded policy for that transaction. `REVIEW` means automated execution is not justified but a governed human decision may resolve the case; resolution is appended without rewriting the original REVIEW decision. `DENY` means execution is not authorized, including after authority revocation or when tenant, identity, evidence, or scope invariants fail.

## What evidence is preserved?

The canonical transaction stores decision-time evidence references, authority and policy references, correlation data, material-change projections, and a record digest. Public-client assertions are append-only. Trust Memory records relevant operational history, while the evidence graph connects the transaction to the sources that informed it. Sensitive credentials and raw secrets are not part of this proof record.

## What do receipt and Replay prove?

A receipt is the durable result of one canonical decision: what was requested, the resulting decision, and the references and digest that bind it. Replay is the ordered event history around that transaction, including decision persistence, evidence linkage, review, execution/outcome signals, authority-integrity observations, and controlled trust projections. Together they support audit and reconstruction without claiming that every external fact is independently true.

## How is tenant/client isolation enforced?

API keys are stored as salted scrypt digests and bound to a tenant and client identifier. Database functions require the service role, re-check tenant, key, client, current membership, scopes, ownership, and authority-management boundaries, and use tenant-qualified keys for rate limiting and persistence. RLS remains enabled on critical tables. Staging proved cross-client and cross-tenant denial; Production canary isolation has not yet been run.

## What was proven in Staging and Production?

Staging proves the complete V1 API behavior on the exact release candidate. Production currently proves recoverability, isolated restoration, forward-migration viability, secret placement, environment binding, hosted Auth/SMTP configuration, a rendered live Turnstile widget, and fail-closed missing/invalid-token behavior. The currently served Production SHA is older than the candidate and is not presented as V1 release proof.

## What is not yet claimed?

Production valid-token, replay, wrong-host, SMTP delivery, recovery callback, magic-link, and full authenticated session evidence are not yet complete. Because those were mandatory pre-deployment gates, PR #72 is unmerged; Production database migrations, candidate deployment, API canary, dashboard canary, and post-canary log inspection have not been executed. No Production ALLOW/REVIEW/DENY, receipt, Replay, revocation, key rotation, or isolation claim is made for this candidate until that sequence completes.
