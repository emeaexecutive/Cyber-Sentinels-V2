# Dependency rules

## Status

Accepted for new and materially changed code. Existing deviations are documented migration debt.

## Direction

Dependencies flow inward from delivery mechanisms to application services and domain policy, then outward through explicit infrastructure interfaces.

```text
app/components -> services -> domain modules -> repository/provider interfaces
                                          -> infrastructure adapters
```

Cycles across these layers are prohibited.

## Rules

### UI cannot access providers directly

- `app/**/page.tsx` and `components/` must not import third-party provider SDKs or provider adapters.
- Client Components call same-origin route handlers or approved server actions.
- Server Components call an application service and receive normalized view data.
- Provider names, raw payloads, secrets, SDK response types and retry policy stay outside presentation code.
- UI may render normalized provider state and evidence limitations supplied by a service.

### Business logic belongs in services

- New use cases belong in `services/<domain>/` when the first real service is introduced.
- A service coordinates domain rules, repositories and provider interfaces.
- Route handlers and pages validate delivery concerns and delegate; they do not become policy engines.
- Pure domain calculations may remain in focused `lib/<domain>/` modules and must not depend on UI or HTTP types.
- Existing service-style modules under `lib/` remain until an approved incremental migration moves them.

### Providers are isolated

- Provider contracts, registry and adapters remain under the provider boundary.
- Adapters translate external requests and responses into canonical internal evidence.
- Credentials are read server-side through validated configuration.
- Providers fail safely, use bounded timeouts and expose truthful runtime states.
- A provider result is evidence input, never an authorization decision.
- Adding a provider requires an adapter, normalization, callback security, health semantics, tests and operational documentation.

### Repositories own persistence

- New persistent domain behavior uses a repository interface rather than inline Supabase queries in UI or policy modules.
- Repositories derive and enforce tenant scope, expose domain-shaped results and centralize query semantics.
- Service-role access is restricted to explicit server repositories or privileged infrastructure gateways.
- Repositories do not decide business policy; they store and retrieve according to the service request.
- Migrations remain the only mechanism for schema changes.
- Existing direct `lib/supabase` queries are grandfathered debt and must be migrated only with focused tests and authorization.

### Shared utilities belong in `lib`

- Pure, reusable utilities and infrastructure gateways belong in `lib/`.
- A utility must not become an unowned dumping ground for business policy.
- Browser-safe and server-only exports remain separated.
- Shared modules use stable types and avoid importing route or component code.

## Allowed dependency matrix

| Caller | May depend on | Must not depend on |
| --- | --- | --- |
| Client component | presentation utilities, browser-safe types, same-origin APIs | server-only modules, service role, provider SDKs, repositories |
| Server page/layout | application services, normalized view models | raw provider SDKs, new inline business policy |
| Route handler | validators, auth, services, response mappers | React components, client-only modules |
| Application service | domain modules, repositories, provider interfaces | React, Next.js page components |
| Domain module | domain types and pure utilities | Next.js, Supabase clients, provider SDKs |
| Repository | database gateway, domain persistence types | React, provider SDKs, business decisions |
| Provider adapter | provider interface, HTTP client, normalization, telemetry | UI, authorization decisions |
| Shared utility | lower-level pure utilities | route handlers, components, mutable domain workflow state |

## Boundary enforcement

- ESLint import restrictions should be introduced in a separately reviewed tooling change.
- Contract tests continue checking provider neutrality, safe failure, authorization and RLS.
- Architecture review rejects new direct SDK or persistence coupling even before automated lint rules exist.
- Type-only imports do not permit runtime boundary violations.
- Dynamic imports and barrel exports must not be used to evade the rules.

## Current exceptions

At the baseline, many Server Components and route handlers import `lib/supabase` directly, and a consistent repository layer does not exist. `app/api/demo/seed/route.ts` and `app/api/enterprise-access/route.ts` construct Supabase SDK clients directly. These are recorded exceptions, not patterns for new work.

Part 1 does not move or alter them because it authorizes no business, database or behavior change.

## Review checklist

- Does presentation receive normalized data?
- Is business policy located in a service or pure domain module?
- Are external provider details isolated behind an adapter?
- Does a repository own persistence and tenant scope?
- Are authentication and authorization evaluated before sensitive work?
- Are failure, timeout, disabled and insufficient-evidence states explicit?
- Is the dependency direction acyclic and testable?
