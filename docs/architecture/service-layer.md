# Service layer

## Current shape

There is no root `services/` directory and no uniform repository layer. Service-like code is distributed across 67 `lib/` subdirectories plus root `lib/*.ts` modules. Route handlers and Server Components often orchestrate domain modules and Supabase directly.

## Service inventory

| Category | Existing implementation | Responsibility |
| --- | --- | --- |
| Business services | `lib/core`, `lib/workflows`, `lib/policy-engine.ts`, `lib/team`, `lib/billing` | Trust lifecycle, workflows, policy, team access and billing rules. |
| Utility services | `lib/env.ts`, `lib/security.ts`, `lib/cache`, `lib/events`, `lib/performance` | Configuration, request safety, caching, events and in-process/durable measurements. |
| Provider services | `lib/providers`, `lib/identity-providers`, `lib/detection/providers`, `lib/integrations` | Provider registry, adapters, callbacks, normalized evidence, detection and integrations. |
| Trust services | `lib/core/trust-*`, `lib/runtime`, `lib/trust-engine`, `lib/trust`, `lib/trust-posture` | Signal execution, algorithms, decisions, posture and lifecycle orchestration. |
| Evidence services | `lib/evidence-graph`, `lib/trust-receipts`, `lib/tracking`, `lib/database/events.ts` | Evidence relationships, receipts, event tracking and persistence helpers. |
| Risk services | `lib/operational-risk`, `lib/detection`, `lib/validation`, `lib/benchmarking` | Shadow ORI, detection, validation gates and benchmark calculation. |
| Replay services | `lib/replay/replay-writer.ts`, `lib/core/replay-engine.ts`, `lib/trust-replay` | Replay writes, retrieval and presentation contracts. |
| Database services | `lib/supabase`, `lib/database` | Browser/server/service-role clients and limited database helpers. |

The main runtime orchestration path is `runTrustExecutionPipeline()`: parallel signals, fusion, authoritative trust algorithm, posture, workflow execution/replay, non-authoritative ORI, governance queue, events and performance samples.

## Intended dependency direction

```text
UI -> Hooks -> Services -> Repositories -> Providers -> External APIs
```

Allowed dependencies point down that chain. Domain types may be shared through dependency-free contracts. External SDKs, service-role clients and secrets remain server-only.

Forbidden dependencies are:

```text
UI -> Providers
UI -> Database
Provider -> UI
```

## Observed exceptions

The intended chain is not the current architecture:

- `hooks/`, root `services/` and a general `repositories/` layer do not exist.
- Server Components under `app/` import `lib/providers` readiness/orchestration and `lib/supabase` directly.
- Ninety-three API route files import Supabase helpers; many handlers contain orchestration and persistence together.
- `app/api/demo/seed` and `app/api/enterprise-access` instantiate the Supabase SDK directly.
- Provider display components use provider types only; no Client Component was found invoking a provider runtime adapter directly.
- Provider modules do not import UI modules, so the provider-to-UI prohibition is currently respected.

These are documented debt. This Codex does not move code or introduce empty layers.

## Permanent rules for new work

- Client Components must never import server-only, provider, service-role or database modules.
- Route handlers authenticate and validate at the boundary, then delegate substantial domain work.
- New external integrations enter through typed adapters and normalized evidence contracts.
- New persistence logic should be isolated behind a domain-owned repository when reuse or transaction boundaries justify it.
- Existing direct imports require incremental migration, tests and an ADR; do not create a parallel service stack.
