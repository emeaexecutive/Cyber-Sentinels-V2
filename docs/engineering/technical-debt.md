# Technical debt register

## Scoring

Priority reflects source-observed risk, not deployed exploit confirmation. Effort is an engineering estimate including implementation and automated tests: S (1-2 days), M (3-5 days), L (1-2 weeks), XL (multi-sprint).

## Critical

| Issue | Description and impact | Recommendation | Effort |
| --- | --- | --- | --- |
| Authorization coverage is not centrally provable | Access depends on middleware prefix arrays, handler-local checks and shared helpers. Thirty-four API routes have no immediately visible local guard; some are intentionally public, while audit/trust/workflow data routes require explicit confirmation. A missed classification could expose tenant or operational data. | Produce an endpoint-by-endpoint authorization test matrix, mark intentionally public contracts, add negative tests and converge on colocated access metadata without weakening current checks. | XL |
| Team tables lack source-visible RLS enablement | `teams` and `team_members` have no `enable row level security` statement in migration source. If exposed through authenticated grants in deployment, cross-user access is possible. | Verify deployed catalog/grants first; then add a forward-only migration and denial tests if the gap is confirmed. | M |

## High

| Issue | Description and impact | Recommendation | Effort |
| --- | --- | --- | --- |
| Direct UI/route-to-database coupling | Server pages and 93 API route files import Supabase helpers; two routes instantiate the SDK directly. Business logic, authorization and persistence are difficult to isolate and test. | Migrate one domain at a time behind existing services and scoped repositories; prohibit new direct Client Component access. | XL |
| API contract inconsistency | Error/success shapes, validation, pagination and auth mechanisms vary across 118 route files. Clients and security review must understand each handler independently. | Adopt `api-standards.md` for new work and migrate stable public contracts through compatibility tests. | XL |
| Rate limiting is partial and process-local | Sensitive analysis, auth and public mutation routes do not share distributed quotas. Horizontal scaling resets local counters and permits uneven enforcement. | Define risk-based limits and add an approved durable/edge limiter with fail-safe behavior and 429 tests. | L |
| Migration final state is difficult to prove | Fifty-eight migrations include repeated table/policy declarations and later hardening. Source inspection cannot prove hosted state. | Add automated migration apply-from-zero, drift detection and deployed schema verification to release gates. | L |
| Environment contract drift | `.env.example` uses `STRIPE_PRO_PRICE_ID`, while runtime requires `STRIPE_PRO_MONTHLY_PRICE_ID`; other live/dynamic variables are undocumented. Misconfiguration can block billing or produce misleading readiness. | Generate a redacted environment contract from typed definitions and test example/runtime parity. | M |
| Provider contracts are fragmented | Verification adapters, older identity providers and detection providers expose different lifecycles. Only Hopae implements the full current identity adapter; World ID and Stripe Identity remain placeholders. | Preserve the working Hopae contract, define conformance tests, and approve any unified lifecycle through an ADR before migration. | L |
| Service-role surface is broad | Admin, validation, provider, billing and public-ingress paths use service-role clients. A missed authorization check bypasses RLS. | Inventory each service-role call, require server-derived scope and add negative integration tests. | L |

## Medium

| Issue | Description and impact | Recommendation | Effort |
| --- | --- | --- | --- |
| No general repository layer | Persistence contracts are embedded in routes and services, complicating transactions and substitution. | Introduce repositories only for reused/transactional domains during approved refactors; avoid an empty parallel layer. | L |
| Route and concept sprawl | 225 pages and many one-page top-level namespaces increase navigation, ownership and middleware-classification cost. | Continue canonical ownership/redirect consolidation; require route-ownership review for additions. | XL |
| Minimal error-boundary coverage | Only the root error boundary exists. Failures in operational namespaces lose local recovery context. | Add nested boundaries only where a distinct recovery/telemetry action is evidenced. | M |
| Accessibility evidence is inconsistent | Several interactive/reusable components lack explicit accessible-name/semantic markers, and no manual audit record covers the library. | Run keyboard, screen-reader, focus, contrast and zoom validation; fix confirmed defects with regression tests. | L |
| No custom hook/shared client-logic layer | Similar form/router/session patterns remain local. Duplication and behavior drift may grow. | Prove duplicate behavior before extracting typed hooks; do not create a placeholder directory. | M |
| No generated Supabase types/ER model | Query/schema drift can reach runtime and relationships are hard to review. | Generate types from a verified schema in CI and maintain a source-derived ER artifact. | M |
| No Realtime baseline | No Realtime publication configuration exists, while notification-like domains could be assumed live by future work. | Keep polling/static behavior explicit; add Realtime only through an approved design with authorization and delivery semantics. | M |
| Component governance is informal | No Storybook, visual harness, versioning or formal deprecation workflow exists; three modules have no static consumer. | Add lightweight catalog tests and a documented deprecation checklist before removing components. | M |
| General RBAC is absent | Authorization is user-versus-admin plus domain-specific checks, limiting enterprise role expression. | Define roles/permissions from actual enterprise workflows and externalize enforcement before adding role claims. | L |

## Low

| Issue | Description and impact | Recommendation | Effort |
| --- | --- | --- | --- |
| Runtime version not pinned | Node/npm behavior can drift between developer and CI environments. | Add approved `engines`/`packageManager` and CI enforcement after confirming deployment compatibility. | S |
| Distributed metadata ownership | Page metadata is repeated across many modules. Copy and canonical settings may drift. | Add shared typed helpers without centralizing page-specific content prematurely. | S |
| Naming/style drift | API field casing, resource/action routes and inline prop types vary. | Apply standards to touched code and avoid broad mechanical rewrites. | M |

## Governance

Every debt item needs an owner, evidence-backed acceptance criteria and a separate authorized implementation change. Priority does not authorize feature work. Close an item only after tests and deployed evidence confirm the risk is resolved.
