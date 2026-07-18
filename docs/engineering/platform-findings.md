# Platform findings

## Executive finding

Cyber Sentinels has substantial, test-backed trust, replay, evidence, provider and governance implementation, but its delivery architecture grew faster than its boundary standardization. The strongest permanent baseline is to preserve authoritative trust decisions, normalized evidence and fail-closed provider/auth behavior while incrementally reducing route, persistence and contract fragmentation.

## Strengths

- Next.js strict mode, strict TypeScript, ESLint, a large chained test suite and production build form a real quality gate.
- Supabase SSR authentication validates protected users server-side and fails protected surfaces safely when configuration is absent.
- Admin access combines session validation, verified email, allowlisting, a second code/cookie gate and audit attempts.
- Provider truth boundaries are explicit: Hopae is active only when enabled/configured; World ID and Stripe Identity do not falsely claim connected verification.
- Provider callbacks use raw-body HMAC/timestamp verification, bounded inputs, idempotency and normalized digest-backed evidence.
- The authoritative Trust Decision remains separate from ORI shadow/advisory output.
- Replay, Trust Memory, Evidence Graph and governance are connected throughout core workflow contracts.
- RLS is broadly present, with increasingly tenant/owner/workspace-scoped hardening.
- Security headers, private/no-store protected responses and server-only secret modules provide useful defense in depth.

## Weaknesses

- There is no consistent hook, service and repository chain; application and API modules often call providers or Supabase directly.
- Authorization ownership is split across prefix lists, handlers, helpers, RLS and service-role paths.
- API schemas and validation are local and inconsistent.
- Source contains 225 pages, 118 API files and multiple legacy/experimental concepts, increasing maintenance and review surface.
- Database history contains repeated object/policy definitions and no automated deployed-drift proof.
- Component accessibility and deprecation governance are informal.
- Provider abstractions are split across verification, identity and detection contracts.

## Architecture risks

- Adding a route without updating middleware can silently make the route public.
- Direct database/provider imports make it easy to duplicate authorization, transaction and failure behavior.
- Parallel concepts such as `agents`/`ai_agents`, old/new provider contracts and multiple trust-engine locations can diverge.
- In-process caches, queues, event buses, profiles and rate limits are not fleet-wide guarantees.
- Broad refactoring could create a second architecture rather than migrate canonical modules; incremental, domain-owned changes are required.

## Security observations

- Two team tables lack source-visible RLS enablement and require deployed verification.
- Thirty-four API routes lack an obvious local guard; many are public by design, but sensitive audit/trust/workflow read paths need explicit contract and negative tests.
- Service-role clients bypass RLS, so every caller is a high-trust boundary.
- A single transitional `TRUST_API_KEY` lacks customer scope, rotation, quotas and replay protection.
- Public forms have Turnstile support, but coverage is not universal and local rate limiting is not distributed.
- JWT validation is correctly delegated to Supabase `getUser()` for consequential checks; `getSession()` is used for navigation presentation and must stay non-authoritative.
- No secret value was added to these documents. Populated personal/default values in `.env.example` should not be treated as deployment-safe.

## Scalability observations

- Next.js Server Components and route handlers provide a workable deployment model, but 118 independent API modules magnify cold-path and observability variance.
- Process-local cache, queue, telemetry and rate-limit state will fragment across instances.
- Explicit indexes cover major workspace, subject, time, provider and retention queries, but production query plans are not captured.
- Trigger-heavy timeline/governance/notification derivation improves continuity but can add write amplification and transaction coupling.
- No Realtime publication is source-defined; current notification continuity should not assume push delivery.
- Provider timeouts, retry bounds and partial-availability behavior are stronger than a synchronous all-or-nothing integration model.

## Maintainability observations

- The new documentation hierarchy and ADRs provide a stable decision record without moving production code.
- Component reuse is meaningful in executive, legal, trust posture and enterprise visual modules, but contracts are often inline.
- No custom hooks exist; shared client logic should be extracted only after confirmed duplication.
- No single environment schema, database generated types or API schema catalog keeps runtime contracts synchronized.
- The complete `npm run validate` command is valuable but long; CI should preserve it while offering fast scoped feedback.

## Permanent baseline

Future Epics should:

1. reuse canonical routes and domain modules;
2. define authentication/authorization and evidence ownership before implementation;
3. keep providers adapter-first, server-only and non-authoritative;
4. preserve replay, audit, tenant scope and blocked-truth states;
5. add repository/service boundaries incrementally around real domains;
6. require negative authorization/RLS tests for sensitive paths; and
7. update these inventories or an ADR when the architecture changes.

This baseline documents gaps; it does not authorize their implementation in CS-ENG-001 Part 2.
