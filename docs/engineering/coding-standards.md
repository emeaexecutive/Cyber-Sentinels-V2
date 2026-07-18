# Coding standards

These standards apply to new and materially changed code. Existing deviations are migration debt and must not be “fixed” through unrelated broad refactors.

## TypeScript

- Keep `strict` type checking enabled and resolve errors without weakening compiler options.
- Prefer explicit domain types, discriminated unions and narrow validation over `any`.
- Treat external input as `unknown` until parsed and validated.
- Model unavailable, degraded, disabled and insufficient-evidence states explicitly.
- Do not use type assertions to bypass authorization, persistence or provider-state checks.
- Keep secrets, service-role clients and privileged types in server-only modules.
- Export the smallest stable public surface from each module.

## React

- Default to Server Components; add `"use client"` only for browser state, effects or interactions.
- Keep rendering deterministic and avoid hydration-dependent layout shifts.
- Use semantic HTML before ARIA and preserve keyboard behavior.
- Components receive normalized view data; they do not interpret raw provider payloads.
- Keep client state local unless a reviewed shared-state need exists.
- Do not introduce a context provider merely to avoid clear prop or service boundaries.

## Next.js

- Use the App Router conventions already present under `app/`.
- Place route-specific UI in its route; move genuinely shared presentation to `components/`.
- Route handlers authenticate, authorize, validate and delegate to services.
- Server Components may load data through an application service or approved persistence gateway.
- Preserve public, authenticated, admin and internal route classifications.
- Do not add a route when an existing canonical surface owns the concept.
- Define metadata for public canonical pages and keep sitemap/robots policy aligned.

## Imports

- Prefer the `@/` alias for cross-directory imports.
- Use relative imports inside a cohesive domain package when that makes the boundary clearer.
- Import types with `import type` where practical.
- UI must not import third-party provider SDKs or `lib/providers` adapters directly.
- Client modules must not import service-role, secret-bearing or `server-only` modules.
- Avoid barrel files that hide cycles or pull server code into client bundles.

## Folder conventions

- `app/`: routing, layouts, route-bound composition and HTTP boundaries.
- `components/`: reusable presentation and interaction components.
- `services/`: target home for new application use cases; create only with real reviewed behavior.
- `lib/`: existing domain modules, shared utilities and infrastructure gateways.
- `lib/providers/`: current provider contracts, registry, adapters and orchestration.
- `lib/supabase/`: current Supabase client factories and privileged gateways.
- `supabase/migrations/`: append-only executable schema changes.
- `tests/`: executable unit, contract, RLS, release-gate and load tests.
- `scripts/`: explicit operational or diagnostic entrypoints, not hidden application behavior.
- `docs/`: versioned architecture, standards, evidence and runbooks.

Do not create empty organizational directories. Introduce a directory with its first real implementation and documentation.

## Naming conventions

- Components and exported React types: `PascalCase`.
- Functions, variables and module exports: `camelCase`.
- Constants that are true immutable contracts: `UPPER_SNAKE_CASE`; otherwise use `camelCase`.
- Files: repository-consistent lowercase kebab case, except existing component conventions.
- Route segments: lowercase kebab case.
- Database identifiers: lowercase snake case.
- Boolean names begin with `is`, `has`, `can`, `should` or another clear predicate.
- Evidence, provider and decision state names use the established exact vocabulary.

## Comments

- Explain why a constraint exists, not what self-explanatory code does.
- Document security boundaries, non-obvious failure behavior and compatibility decisions.
- Do not leave speculative capability claims in comments.
- TODOs require an owner or issue reference and must not mask a release blocker.
- Never place secrets, personal data or production payloads in comments or fixtures.

## Documentation

- Update architecture, API, database, security, testing and rollback records with the change they describe.
- Label present, simulated, blocked, proposed and future behavior accurately.
- ADRs record durable decisions; implementation guides do not silently change an ADR.
- Include commands, environment and date when reporting validation evidence.
- Do not present repository source as proof of deployed configuration.

## Testing

- Add the smallest test that proves the behavior and its failure path.
- Test authorization denial, tenant isolation and invalid input for protected behavior.
- Provider tests cover missing credentials, timeouts, malformed responses and safe disablement.
- Persistence changes include migration and RLS tests where applicable.
- Regression tests accompany bug fixes.
- Live-provider, deployed-target and destructive fixture commands require explicit target approval and are never implied by `npm test`.

## Accessibility

- Meet WCAG 2.2 AA expectations for user-facing changes.
- Preserve semantic landmarks, heading order, labels, accessible names and focus visibility.
- All interaction must work by keyboard without relying on pointer position.
- Touch targets should be at least 44 by 44 CSS pixels where feasible.
- Do not use color as the only state indicator.
- Validate responsive reflow, zoom and reduced-motion behavior when applicable.

## Performance

- Prefer Server Components and static generation for public content.
- Avoid unnecessary client boundaries, hydration and provider SDKs.
- Parallelize independent server work while preserving timeout and failure isolation.
- Bound external calls with timeouts and safe retry rules; never blindly retry non-idempotent operations.
- Measure representative paths before making performance claims.
- Keep logs and telemetry sanitized, bounded and non-blocking.

## Security baseline

- Authenticate and authorize before sensitive execution.
- Derive tenant and user scope server-side; do not trust client-selected scope.
- Fail closed for authorization and fail safely for optional providers.
- Normalize and minimize external provider evidence.
- Preserve append-only audit references and explicit rollback.
- Never select or label a provider as healthy solely because a key exists.
