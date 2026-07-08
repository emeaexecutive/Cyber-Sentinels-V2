# Platform Consolidation Report

Last updated: 2026-07-08

## Executive Summary

Cyber Sentinels is consolidated around a single enterprise TrustOps platform: Trust Engine, Decision Engine, Replay Engine, provider abstraction, validation harness, governance review, and evidence receipts. No capabilities were removed in this pass. The public discovery model is simplified while protected, admin, developer, demo, and experimental surfaces remain available through canonical hubs.

## Canonical Navigation

| Top-level area | Canonical route | Houses |
| --- | --- | --- |
| Platform | `/platform` | TrustOps overview, posture, replay, governance, sovereignty. |
| Solutions | `/enterprise/hiring-security` and `/enterprise/agent-governance` | Hiring security, agent runtime trust, evidence, replay. |
| Enterprise | `/enterprise` | Access, pilot, readiness, control-plane story. |
| Developers | `/developers` | Docs, authentication, integration guidance, protected API keys. |
| Pricing | `/pricing` | Packaging and upgrade path. |
| Resources | `/demo`, `/help`, `/security`, `/about` | Demo journeys, support, company and security context. |
| Trust Center | `/trust` | Public trust, governance, methodology and auditability. |
| Login | `/login` | Authenticated access. |

## Consolidation Decisions

- Public pages keep buyer-facing language and avoid raw dashboard, provider, benchmark, seed, or repair-tool leakage.
- Enterprise workflows stay behind authenticated routes unless they are explicit buyer/demo pages.
- Admin pages remain behind allowlisted admin access, step-up back-office checks, noindex headers, and hidden navigation.
- Experimental concepts such as origin, reality, human-presence, trust-graph, trust-ledger, and detection labs stay hidden until merged into replay, provider readiness, or trust-center narratives.
- Developer content is centralized under `/developers`; API keys and consoles stay protected.

## Production Readiness Priorities

1. Keep replay, receipt, evidence, authorization lineage, governance review, and trust posture as the product spine.
2. Route all provider work through the existing provider abstraction and explicit states: Live, Simulated, Awaiting Credentials, Disabled.
3. Route all validation work through the benchmark harness and dataset registry, with ground-truth and reviewed outcomes before precision/recall claims.
4. Use lazy public discovery and protected operational surfaces rather than publicizing internal dashboards.
5. Preserve auth, RLS, admin allowlist, Turnstile, rate limiting, and secret-bound provider credentials.
