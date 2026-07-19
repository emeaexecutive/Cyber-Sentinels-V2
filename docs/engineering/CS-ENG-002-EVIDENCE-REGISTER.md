# CS-ENG-002 Evidence Register

**Audit date:** 2026-07-19
**Repository baseline:** `main` at `d55cbac`
**Purpose:** stable references for the CS-ENG-002 reports. Evidence proves only the stated boundary; repository evidence is not evidence that a migration or external control is deployed.

| ID | Area | Evidence | What it proves | Limitation |
| --- | --- | --- | --- | --- |
| EVID-0001 | Git | `git branch --show-current`; `git rev-list --left-right --count origin/main...main` | Audit began on `main`, with zero recorded divergence | Does not prevent a later remote update |
| EVID-0002 | Git | `git status --short --branch` | Three pre-existing modified documentation files and pre-existing `reports/` content were present | These user changes were excluded from the audit scope |
| EVID-0003 | Git | `git log -1`; tag inventory | Baseline revision was `d55cbac`; one tag exists | A tag is not a release approval |
| EVID-0004 | Framework | `package.json`, `package-lock.json`, `next.config.mjs`, `tsconfig.json` | Next.js 15.5.20, React 19, TypeScript, npm lockfile, App Router build scripts | No Node engine is declared; Vercel uses Node 24.x while the audit CLI ran under Node 26.1.0 |
| EVID-0005 | Inventory | Timestamped audit report | 225 page modules, 118 API modules, 46 components, 262 library files, 58 migrations and 46 tests | Counts do not establish quality or reachability |
| EVID-0006 | Routing | `app/`; absence of `pages/` and `src/pages/` | App Router is the only router; no resolved duplicate page routes were detected | Similar-purpose routes and redirects still require product ownership |
| EVID-0007 | Routing | `app/governance/page.tsx` | Governance renders governance content and links to `/dashboard/governance` | Confirms the former Governance/Login duplication is no longer present |
| EVID-0008 | Routing | `next.config.mjs` | Canonical redirects and global security-header source configuration exist | CSP still permits `unsafe-inline` and `unsafe-eval` |
| EVID-0009 | Authentication | `app/login/page.tsx`, `app/auth/callback/route.ts` | Registration, password login, OAuth callback path and password-reset initiation exist | Credentialed end-to-end auth was not executed |
| EVID-0010 | Authentication | `app/reset-password/page.tsx`, `app/verify-email/page.tsx` | Password update and email-confirmation resend paths exist | Provider configuration and delivery are external |
| EVID-0011 | Authentication | `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` | Server-validated sessions, refresh-error handling, protected route prefixes and private/no-store responses exist | Prefix lists are hand-maintained and lack browser coverage |
| EVID-0012 | Admin authorization | `lib/admin-auth.ts`, `lib/auth/isAdmin.ts`, `app/api/admin/access/route.ts` | Admin email allowlist, server session check, access-code gate and HttpOnly cookie path exist | Email allowlist is not an enterprise RBAC model; shared access-code governance is external |
| EVID-0013 | Tenancy | `supabase/migrations/202605260001_private_beta_schema_fix.sql` | `teams` and `team_members` tables exist with email-based ownership/membership columns | No organization/enterprise foreign key or immutable membership authority exists |
| EVID-0014 | Critical RLS | `supabase/migrations/20260528_explicit_supabase_api_grants.sql` | `teams` and `team_members` receive authenticated select/insert/update grants and `USING (true)` / `WITH CHECK (true)` policies | No later migration replaces these two policies with tenant-scoped rules |
| EVID-0015 | Exploitability | `app/team-access/page.tsx`, `app/team-workspace/page.tsx`, `app/api/team/summary/route.ts`, `app/api/team/invite/route.ts` | Runtime paths read and mutate the affected team records | Live exploit proof was intentionally not attempted |
| EVID-0016 | Workspace tenancy | `supabase/migrations/202606080006_operational_hardening_rls.sql` | `trust_workspaces`, members and cases have `auth.uid()`-based owner/member policies | Does not remediate the older `teams` model or prove deployed state |
| EVID-0017 | Owner RLS | `supabase/migrations/202607010001_production_owner_scoped_rls.sql` | Owner-email policies replace broad policies for passports, reports, cases and audit logs | Email identity is weaker than immutable user/tenant IDs; live denial tests were not run |
| EVID-0018 | Enterprise tenancy | `supabase/migrations/202606180001_enterprise_ai_trust_governance.sql` | `enterprise_id` columns exist on certifications, alerts and agents | Enterprise IDs are not foreign-keyed to an authoritative membership model; null-owner policy branches and broad provenance policies remain |
| EVID-0019 | Tenant input | `app/api/agents/route.ts`, `app/api/trust/certifications/route.ts`, `app/api/trust/alerts/route.ts` | Client bodies can supply `enterprise_id` | Values are not derived from trusted server membership context |
| EVID-0020 | Migration safety | Migration filename and content inventory | No duplicate numeric prefix or empty SQL migration was found | There is no `supabase/config.toml`, automated drift check or applied-state proof |
| EVID-0021 | Provider architecture | `lib/providers/types.ts`, registry, orchestrator, normalization and health modules | A provider-neutral contract and normalization layer exist | Several integrations are descriptive or inactive rather than end-to-end |
| EVID-0022 | Hopae | `lib/providers/adapters/hopae/*`, `app/api/providers/route.ts` | Hopae has configuration, timeout/retry, health, signed callback and persistence code | Live sandbox/production calls are credential-gated |
| EVID-0023 | Provider persistence | `supabase/migrations/202607160001_release_1_rc1_provider_evidence_gate.sql`, `202607170002_provider_abstraction_hopae.sql` | Idempotent event/evidence persistence, registry and health schema exist in migration source | Applied Production state is unverified |
| EVID-0024 | World ID | `app/api/verify/world/route.ts` | Route explicitly refuses to treat received proof shape as verified | Server-side provider exchange is missing |
| EVID-0025 | Other providers | `lib/detection/providers/*`, `lib/providers/registry.ts` | Named adapters/registrations exist for media and identity providers | Most lack verified initialization, live transaction, callback and calibration evidence |
| EVID-0026 | Identity | `lib/providers/provider-consensus.ts`, `lib/providers/signals.ts` | Provider signal normalization and consensus functions exist | No canonical enterprise identity-confidence service/API persists the result |
| EVID-0027 | Identity signals | `lib/detection/detection-engine.ts`, `lib/human-presence-index.ts`, session-integrity modules | Heuristic signal and session models exist and label mock/demo limitations | Document, phone, device attestation, biometric and deepfake claims are not production-verified |
| EVID-0028 | Evidence graph | `lib/evidence-graph/*`, trust-graph libraries, graph migrations and UI routes | Graph relations, queries, persistence shapes and visualization exist | Multiple graph implementations and incomplete canonical persistence remain |
| EVID-0029 | Replay | `lib/core/replay-engine.ts`, `lib/trust-replay/replay.ts`, replay routes/migrations | Replay construction and persistence paths exist | Deterministic reconstruction is not universal and credentialed authorization tests are absent |
| EVID-0030 | Trust Memory | `lib/trust-memory*`, trust-memory migrations and admin/demo routes | Historical memory structures and trust evolution logic exist | Process-local/demo and durable paths coexist; decay/revocation behavior is not one enforced contract |
| EVID-0031 | ORI | `lib/operational-risk/*`, `202607170001_operational_risk_intelligence_shadow.sql` | Feature pipeline, logistic artifact, validation metrics, shadow mode and persistence schema exist | Synthetic validation and shadow mode do not establish production calibration |
| EVID-0032 | Decision engine | `lib/trust/decision-engine.ts`, `lib/core/decision-intelligence.ts`, decision APIs/tests | Decision states, reason codes and policy-related logic exist | Multiple engines/contracts remain and human override is not universally persisted |
| EVID-0033 | Runtime durability | process-local queues, event bus, cache, telemetry and replay writer modules | Useful runtime instrumentation and orchestration code exists | Serverless process memory cannot be treated as durable evidence or fleet-wide telemetry |
| EVID-0034 | Enterprise UX | Enterprise, dashboard, admin and pilot route inventories | A broad navigable enterprise surface exists | Several pages use demo fallbacks/static metrics; no completed customer pilot evidence exists |
| EVID-0035 | API architecture | Timestamped API inventory; `lib/operational-trust/api.ts`; `lib/security.ts` | Many sensitive routes perform server auth, validation and owner-scoped queries | Controls are inconsistent; only 13 route modules expose rate-limit evidence and the limiter is process-local |
| EVID-0036 | Webhooks | Hopae callback security, ATS security and Stripe webhook routes | Signature validation exists for principal webhook paths | Credentialed negative/replay verification is incomplete outside Hopae source tests |
| EVID-0037 | Secrets | Tracked-file secret-pattern scan; `lib/supabase/service-role.ts` | No suspicious committed secret pattern was detected; service-role helper is `server-only` | Pattern scan is not a Git-history or dedicated secret-scanner result |
| EVID-0038 | Environment | `.env.example`, source reference inventory | Core Supabase, Hopae, Stripe, Turnstile and OpenAI names are documented | Many runtime/test names are absent; Stripe price naming drifts between `STRIPE_PRO_PRICE_ID` and `STRIPE_PRO_MONTHLY_PRICE_ID` |
| EVID-0039 | Headers | `next.config.mjs`; live canonical response headers | CSP, HSTS, frame denial, MIME sniffing, referrer and permissions headers are served | CSP weakening and dashboard-managed edge controls remain gaps |
| EVID-0040 | Tests | `tests/`; `package.json` script expansion | 46 tests exist; 31 are in default `npm test`; default chain passed | 15 are opt-in; many tests assert source text and no Playwright/axe suite exists |
| EVID-0041 | Quality | Audit run: lint, type-check, test and build | All passed; lint reported zero errors and six warnings; build completed | Local build does not prove authenticated production workflows |
| EVID-0042 | Dependencies | Approved `npm audit --omit=dev` retry | Zero production dependency vulnerabilities were reported on 2026-07-19 | No CI/scheduled enforcement exists |
| EVID-0043 | CI/CD | Absence of `.github/workflows`; Part 6 CI documents | CI architecture and required checks are documented | No workflow or repository-enforced merge gate exists |
| EVID-0044 | Vercel | `vercel inspect` deployment `dpl_CPwMiyD5VsLP8K6FN8r8DezFy2ei` | Canonical alias resolves to a Ready Production target | Production Branch and protection policy were not exposed by inspected CLI state |
| EVID-0045 | Vercel project | `vercel project inspect cyber-sentinels-v2` | Next.js preset, `npm install`, `npm run build`, `.next`, Node 24.x | Environment-variable completeness was not proven; values were not inspected |
| EVID-0046 | Canonical domain | HEAD checks for `/`, `/dashboard`, `/api/health` | Public root and health return 200; dashboard redirects to login with private/no-store and noindex | No authenticated or provider transaction was performed |
| EVID-0047 | Cloudflare | Live response `Server: cloudflare`, `cf-ray` and security headers | Canonical traffic is proxied by Cloudflare | DNSSEC, SSL mode, WAF, bot, rate-limit, Access and API Shield dashboards are unverified |
| EVID-0048 | Observability | Health/status APIs, operational-monitoring and performance modules | Basic health and application telemetry paths exist | No centralized APM, distributed trace backend, uptime proof or tested alerts exist |
| EVID-0049 | Operations | `docs/operations`, `docs/runbooks`, `docs/releases` | Incident, alert, rollback, release and recovery procedures are documented | No incident exercise, rollback drill or restore test is evidenced |
| EVID-0050 | Audit artifact | `reports/cs-eng-002-audit-20260719-142413.md` | Reproducible Git, inventory, route, API, migration, env and check evidence | Static heuristics are conservative and require the human conclusions in CS-ENG-002 reports |

## Evidence handling rules

- Secret values, cookies, tokens, identity payloads and customer data were not printed or retained.
- External checks were read-only. No deployment, migration, provider transaction or configuration mutation occurred.
- `BLOCKED BY CREDENTIALS` is used only where a safe end-to-end test needs unavailable test identities or provider secrets.
- `BLOCKED BY EXTERNAL CONFIGURATION` is used where repository evidence cannot establish dashboard or deployed-state truth.
