# CS-ENG-001 Implementation Matrix

**Source audit:** `main` at `e3fe37a`, 2026-07-19<br>
**Publication state:** Parts 1-6 documentation complete; runtime gaps remain<br>
**Detailed evidence:** `CS-ENG-001_GAP_ANALYSIS.md`

Documentation presence is not runtime implementation. `IMPLEMENTED` below means repository implementation only unless deployed evidence is explicitly named.

| Part | Capability | Required files/configuration | Status | Evidence | Gap | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Framework foundation | Next.js, TypeScript, lint and package metadata | IMPLEMENTED | `package.json`, lockfile, framework/config files; local gates pass | Toolchain version is not pinned | Add Node/npm contract |
| 1 | Quality commands | Lint, typecheck, tests and build | IMPLEMENTED | `package.json`; commands exercised in audit | CI does not enforce them | Implement required CI checks |
| 1 | Git/Production workflow | `main`, review, protected delivery | PARTIALLY IMPLEMENTED | `deployment-policy.md`; historical Vercel verification | Branch controls/CODEOWNERS external or absent | Configure and export protections |
| 1 | ADR and dependency governance | ADRs, ownership and boundary rules | DOCUMENTED ONLY | `docs/adr/`, dependency rules | Multiple overlapping runtime engines; no boundary tests | Canonicalize owners and imports |
| 2 | App Router and layouts | Pages, layouts, errors and loading | IMPLEMENTED | 224 page modules; build passes | Route/browser coverage incomplete | Maintain canonical route register |
| 2 | Route and API protection | Middleware plus handler authorization | PARTIALLY IMPLEMENTED | `middleware.ts`, server auth/admin helpers | Manual lists drift; no exhaustive endpoint matrix | Map every route to auth/audit policy |
| 2 | Service/domain architecture | Canonical reusable modules | PARTIALLY IMPLEMENTED | `lib/core`, `runtime`, `providers`, `governance`, `workflows` | Duplicate engines and direct data access | Consolidate entry points |
| 2 | API platform | Route handlers, schemas and contracts | PARTIALLY IMPLEMENTED | 118 route modules; public contract registry | No complete request-level contract/deprecation suite | Add API registry and integration tests |
| 2 | Supabase and schema | Clients, migrations, RLS and types | PARTIALLY IMPLEMENTED | Client variants and 58 SQL migrations | No config/fresh-schema CI/applied-state proof; generated types absent | Establish migration pipeline |
| 2 | Authentication | Supabase login/session lifecycle | PARTIALLY IMPLEMENTED | Login, callback, verify, reset, logout and middleware | Credentialed full lifecycle unverified | Run isolated browser/auth suite |
| 2 | Authorization and tenancy | User/admin/org roles and RLS | PARTIALLY IMPLEMENTED | Admin gates, workspaces/memberships and tenant helper | Teams lack source RLS; email-owner legacy; no full RBAC | Close tenant/RBAC P0 |
| 2 | Provider abstraction | Registry, adapters, security and health | PARTIALLY IMPLEMENTED | Provider modules and tests | Lifecycle/universal envelope incomplete | Finish canonical provider contract |
| 2 | Hopae live path | Credentials, target session/callback | BLOCKED BY CREDENTIALS | Hopae adapter/client/harness | No approved target transaction | Run approved sandbox/target proof |
| 2 | Additional identity providers | Second canonical adapter and consensus | DOCUMENTED ONLY | Provider names/readiness records | No second live canonical adapter | Implement under EPIC 17 |
| 3 | Evidence normalization/store | Canonical immutable evidence envelope | PARTIALLY IMPLEMENTED | Normalizers, evidence tables/chains and selected immutability | Multiple shapes; universal constraints absent | Version one evidence contract |
| 3 | Evidence Graph | Durable rebuildable graph | PARTIALLY IMPLEMENTED | Graph code, API/UI and graph tables | In-memory/legacy coexistence; no versioned rebuild proof | Canonicalize projection |
| 3 | Replay | Exact versioned chronology/re-execution | PARTIALLY IMPLEMENTED | Replay engine/writer/API/pages and timeline | Universal version manifest and durable reconciliation absent | Add golden replay contract |
| 3 | Trust Memory | Durable event/snapshot lifecycle | PARTIALLY IMPLEMENTED | Memory/evolution modules and append-only trigger | Universal registry and deployed retention proof absent | Version snapshots and privacy tests |
| 3 | ORI | Reviewed, non-authoritative risk intelligence | PARTIALLY IMPLEMENTED | Shadow migration, model/features and tests | Zero approved reviewed cases; off/shadow/advisory | Keep non-authoritative; collect evidence |
| 3 | Policy, authority and enforcement | Versioned allow/deny control path | PARTIALLY IMPLEMENTED | Policy/authority/enforcement modules | Multiple owners; external enforcement receipts incomplete | Consolidate and persist versions |
| 3 | Trust Decision Engine | One canonical versioned decision envelope | PARTIALLY IMPLEMENTED | Decision engines/APIs/UI | Multiple paths/vocabularies; deployed E2E proof absent | Establish canonical envelope |
| 3 | Reports/evidence packs | Authorized versioned exports | PARTIALLY IMPLEMENTED | JSON/PDF/summary routes and UI | Legacy conflict, CSV/accessibility/deployed quality gaps | Consolidate report owner |
| 3 | Trust observability | Retained metrics/traces/alerts | PARTIALLY IMPLEMENTED | Health model, profiler, durable measurement writer | Process-local paths; no centralized APM/alerts | Implement operations architecture |
| 4 | Public website | Canonical accessible public experience | PARTIALLY IMPLEMENTED | Public routes and successful build | Route drift and browser/accessibility gaps | Complete crawl and ownership pass |
| 4 | Enterprise journey | Buyer, pilot, intake and workspace | PARTIALLY IMPLEMENTED | Enterprise/pilot/access routes and components | No retained design-partner outcome | Run controlled pilot workflow |
| 4 | Dashboard/governance/Back Office | Protected enterprise operations | PARTIALLY IMPLEMENTED | Protected pages, APIs and Supabase records | Broad queries, incomplete RBAC and credentialed UX tests | Validate roles, scale and accessibility |
| 4 | Reports and transparency | Enterprise views and exports | PARTIALLY IMPLEMENTED | Trust/report/receipt/compliance surfaces | Format/data consistency incomplete | Verify canonical production export |
| 4 | Accessibility/performance | Automated/manual quality evidence | PARTIALLY IMPLEMENTED | Source patterns and local profiling | No browser a11y gate or protected representative load | Add Playwright/axe and budgets |
| 4 | Product analytics | Consent-aware governed events | MISSING | Analytics document records inactive state | No consent controller/provider/event pipeline | Implement only after privacy approval |
| 4 | Production data truth | No silent demo substitution | PARTIALLY IMPLEMENTED | Source modes/labels exist | Several APIs/pages fall back to demo data | Fail explicitly in Production |
| 5 | Authentication/MFA security | Session policy and enforced step-up | PARTIALLY IMPLEMENTED | Auth security plus MFA structure | MFA recovery/device simulated; provider settings unknown | Implement/test enforced MFA |
| 5 | RLS and tenant isolation | All tenant tables and live denial | PARTIALLY IMPLEMENTED | Extensive policies and gated denial tests | Coverage gaps and no deployed proof | Add RLS and run live suite |
| 5 | Secrets/environment | Typed names, scoped stores and rotation | PARTIALLY IMPLEMENTED | Server-only helpers and example | External inventory blocked; Stripe name drift | Fix parity and verify platforms |
| 5 | Webhooks/bot/rate controls | Signatures, replay, Turnstile, distributed limits | PARTIALLY IMPLEMENTED | Callback ledger/security and selected guards | Turnstile credentials blocked; limiter process-local | Deploy durable edge limits and target tests |
| 5 | Edge controls | Cloudflare DNS/TLS/WAF/bot | BLOCKED BY EXTERNAL CONFIGURATION | Historical live headers | Dashboard state cannot be inferred | Export reviewed edge evidence |
| 5 | Headers/audit/privacy | Browser policy, append-only audit, rights/retention | PARTIALLY IMPLEMENTED | Headers, audit/data-rights/retention paths | CSP unsafe directives; audit/retention not universal | Harden and verify target state |
| 5 | Dependency security | Production advisory hygiene | IMPLEMENTED | Lockfile, PostCSS remediation, recorded zero-vulnerability audit | No continuous CI gate | Add scheduled/merge scanning |
| 5 | Security validation | Static, deployed and RLS evidence | PARTIALLY IMPLEMENTED | Source tests and opt-in harnesses | No CI scans, pen test or default live tests | Implement CI and approved target runs |
| 6 | Testing architecture/inventory/strategy/data | Required testing documents | DOCUMENTED ONLY | `docs/testing/testing-*.md`, inventory and data policy | Browser/ephemeral/live implementation incomplete | Implement target test layers |
| 6 | Production smoke | Safe post-deploy procedure and harness | PARTIALLY IMPLEMENTED | Smoke document and deployed security harness | Auth/provider/RLS credentials and automation absent | Run per approved release |
| 6 | CI architecture/checks | Workflow design and merge gates | DOCUMENTED ONLY | `ci-architecture.md`, `required-ci-checks.md` | No workflow or branch enforcement | Add CI configuration |
| 6 | Production deployment | Main/Vercel procedure | DOCUMENTED ONLY | `production-deployment.md` | External settings/current proof required | Verify for each release |
| 6 | Migration operations | Apply/drift/rollback/restore process | DOCUMENTED ONLY | `migration-operations.md` | No tool config, automation or restore drill | Implement and exercise |
| 6 | Release management | Process, release/checklist/go-no-go templates | DOCUMENTED ONLY | `docs/releases/` Part 6 artifacts | No enforced workflow or completed release using them | Use on next release |
| 6 | Observability and health | Signal architecture and safe health contract | PARTIALLY IMPLEMENTED | Operations docs plus runtime health/telemetry | Central backend, readiness endpoints and retention missing | Implement and test |
| 6 | Alerting and incidents | Alert matrix, command workflow and template | DOCUMENTED ONLY | `docs/operations/alert-matrix.md`, incident docs | No configured/tested alerts or exercised program | Configure and tabletop |
| 6 | Application/database rollback | Approved runbooks | DOCUMENTED ONLY | `docs/runbooks/application-rollback.md`, `database-rollback.md` | No controlled rollback/restore evidence | Exercise safely |
| 6 | Disaster recovery | DR architecture and test plan | DOCUMENTED ONLY | DR and recovery-test documents | External prerequisites and exercises absent | Establish and measure RTO/RPO |
| 6 | Operational ownership | Role-based responsibility matrix | DOCUMENTED ONLY | Operations responsibility matrix | Named staffing/on-call external | Assign and review |
| 6 | Final publication package | Gap analysis, matrix, Master Blueprint and final report | IMPLEMENTED | CS-ENG-001 publication documents | Runtime/product gaps remain | Govern updates with code/evidence |

## Interpretation

The Blueprint documentation is accepted with gaps. The application is buildable, but controlled-pilot, production-security, external-provider and operational-readiness approvals remain blocked until the listed evidence exists.
