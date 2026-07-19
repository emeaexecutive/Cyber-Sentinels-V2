# CS-ENG-002 Implementation Matrix

**Baseline:** `main` at `d55cbac` on 2026-07-19.
**Confidence:** High = direct code/execution evidence; Medium = static inference across related paths; Low = external or credentialed state unavailable.
**Effort:** XS under half a day; S half to one day; M two to five days; L one to two weeks; XL more than two weeks.

| Domain | Capability | Expected implementation | Repository evidence | Status | Severity | Confidence | Gap | Recommended action | Estimated effort |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Repository | Git baseline | Valid `main`, origin, clean conflict state | EVID-0001-EVID-0003 | IMPLEMENTED | INFORMATIONAL | High | Pre-existing unrelated doc edits remain | Preserve/exclude them from audit commits | XS |
| Repository | Framework baseline | Supported, pinned application toolchain | EVID-0004 | PARTIALLY IMPLEMENTED | MEDIUM | High | Node engine absent; Vercel/local versions differ | Declare and align Node | XS |
| Repository | Inventory ownership | Routes/components/services have canonical owners | EVID-0005 | PARTIALLY IMPLEMENTED | MEDIUM | Broad surface and overlapping implementations | Add ownership map/CODEOWNERS | S |
| Routing | Router consistency | One router without resolution collisions | EVID-0006 | IMPLEMENTED | LOW | Similar-purpose routes remain | Maintain generated route inventory | XS |
| Routing | Governance route | Governance content, not Login duplication | EVID-0007 | IMPLEMENTED | MEDIUM | Regression test absent | Add focused source/browser test | XS |
| Routing | Redirects/rewrites | Canonical, non-cyclic redirects | EVID-0008 | PARTIALLY IMPLEMENTED | MEDIUM | Source reviewed; exhaustive browser crawl absent | Add redirect/canonical crawl | S |
| Routing | Loading/error/not-found | Owned states for principal routes | EVID-0005-EVID-0006 | PARTIALLY IMPLEMENTED | MEDIUM | Sparse local loading/error and no root not-found evidence | Define route-state standard | S |
| Routing | Orphan/dead UI | No unreachable duplicate surface | EVID-0005, EVID-0034 | PARTIALLY IMPLEMENTED | MEDIUM | Broad similar-purpose and demo surfaces | Generate import/navigation reachability report | M |
| Authentication | Registration | Supabase signup and confirmation redirect | EVID-0009 | PARTIALLY IMPLEMENTED | HIGH | No credentialed E2E/delivery proof | Add safe auth E2E | M |
| Authentication | Login | Password/OAuth UI and server session | EVID-0009-EVID-0011 | PARTIALLY IMPLEMENTED | HIGH | Credentialed Production login not executed | Run approved test-account flow | S |
| Authentication | Logout | Server logout route and cookie clearing | EVID-0011 | PARTIALLY IMPLEMENTED | HIGH | E2E invalidation not verified | Test session/cookie denial after logout | S |
| Authentication | Password reset | Reset initiation and password update | EVID-0009-EVID-0010 | PARTIALLY IMPLEMENTED | HIGH | Email/provider delivery unverified | Add token lifecycle E2E | M |
| Authentication | Email confirmation | Resend, callback and middleware verified-email gate | EVID-0010-EVID-0011 | PARTIALLY IMPLEMENTED | HIGH | External Supabase email settings blocked | Verify with test account | S |
| Authentication | Session persistence/expiry | Refresh handling, timeout and expired-session redirect | EVID-0011 | PARTIALLY IMPLEMENTED | HIGH | Browser duration/revocation tests absent | Add session lifecycle suite | M |
| Authentication | Unauthorized access | Protected routes redirect/fail unavailable | EVID-0011, EVID-0046 | IMPLEMENTED | HIGH | Only representative live route checked | Expand protected route matrix | S |
| Authentication | MFA/step-up | Enforced MFA for privileged actions | MFA structure; EVID-0012 | DOCUMENTED ONLY | HIGH | No provider-backed enrollment/recovery/enforcement proof | Implement and test step-up | L |
| Authorization | Admin access | Server session, allowlist, access code, secure cookie | EVID-0012 | PARTIALLY IMPLEMENTED | HIGH | Shared code/allowlist is not RBAC; lifecycle external | Move to role/step-up model | M |
| Authorization | Back Office protection | Middleware and server/API authorization | EVID-0011-EVID-0012 | PARTIALLY IMPLEMENTED | HIGH | Some endpoints rely primarily on middleware; no browser role suite | Add defense-in-depth tests/checks | M |
| Authorization | Enterprise roles | Versioned roles and permissions | EVID-0018-EVID-0019 | PARTIALLY IMPLEMENTED | HIGH | No canonical enterprise membership/delegation model | Implement authoritative RBAC | L |
| Authorization | Tenant derivation | Tenant from trusted server membership | EVID-0018-EVID-0019 | MISSING | CRITICAL | High | Request bodies can supply `enterprise_id` | Derive and validate tenant server-side | L |
| Authorization | Team isolation | Per-team RLS for all operations | EVID-0013-EVID-0015 | PARTIALLY IMPLEMENTED | CRITICAL | Authenticated-wide team/member policies | Replace policies and test two tenants | M |
| Authorization | Workspace isolation | Owner/member workspace RLS | EVID-0016 | PARTIALLY IMPLEMENTED | HIGH | Source exists; live denial not proven | Run live RLS denial suite | M |
| Authorization | Sensitive exports | Auth, role and tenant-scoped downloads | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Auth paths exist; uniform role/tenant/cache tests absent | Centralize export authorization | M |
| Database | Migration ordering | Unique, non-empty ordered migrations | EVID-0020 | IMPLEMENTED | MEDIUM | Naming conventions vary | Enforce static migration checks | S |
| Database | Clean migration replay | From-zero ephemeral apply | EVID-0020 | MISSING | HIGH | No Supabase project config or replay evidence | Add ephemeral database workflow | M |
| Database | Schema drift | Repo/deployed schema comparison | EVID-0020, EVID-0049 | BLOCKED BY CREDENTIALS | HIGH | Production ledger/schema unavailable | Run authorized drift check | S |
| Database | `enterprise_id` state | Columns/types/indexes applied consistently | EVID-0018-EVID-0020 | BLOCKED BY CREDENTIALS | HIGH | Repository source only; trusted relation absent | Verify then migrate to authoritative FK | M |
| Database | Core owner RLS | Owner policies for passports/reports/cases/audit | EVID-0017 | PARTIALLY IMPLEMENTED | HIGH | Email ownership and no live proof | Move toward IDs and run denial tests | L |
| Database | Team RLS | Tenant policy for teams/members | EVID-0013-EVID-0015 | PARTIALLY IMPLEMENTED | CRITICAL | Broad policies remain | Stage 0 remediation | M |
| Database | Enterprise RLS | Certification/alert/provenance tenant policies | EVID-0018 | PARTIALLY IMPLEMENTED | HIGH | Null owner and broad provenance branches | Replace with membership predicates | M |
| Database | Provider RLS | Tenant read and service-only mutation | EVID-0023 | PARTIALLY IMPLEMENTED | HIGH | Source strong; deployed state unverified | Replay and live-test migrations | M |
| Database | Rollback/restore | Safe forward repair and tested restore | EVID-0049 | DOCUMENTED ONLY | HIGH | No exercise evidence | Execute isolated restore drill | L |
| API | Complete inventory | Every handler/method/control recorded | EVID-0005, EVID-0050 | IMPLEMENTED | INFORMATIONAL | Heuristic classifications require maintenance | Regenerate each audit | XS |
| API | Authentication consistency | Sensitive APIs authenticate server-side | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Patterns differ across helpers/middleware/routes | Centralize auth wrapper and tests | L |
| API | Authorization consistency | Role/owner/tenant enforced per route | EVID-0035 | PARTIALLY IMPLEMENTED | CRITICAL | Team/enterprise authority gaps | Bind every sensitive route to trusted context | L |
| API | Input validation | Bounded schema validation | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Mostly custom validation; inconsistent contracts | Adopt shared schemas/limits | L |
| API | Error safety | Stable errors without production stack leakage | API source inventory | PARTIALLY IMPLEMENTED | MEDIUM | Multiple response styles and redirects | Standardize error envelope | M |
| API | Rate limiting | Durable actor/tenant/IP controls | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Limited coverage and process-local limiter | Implement edge/durable limiter | M |
| API | Idempotency | Required on retried mutations/webhooks | EVID-0022-EVID-0023, EVID-0036 | PARTIALLY IMPLEMENTED | HIGH | Strong Hopae path; not universal | Define endpoint idempotency policy | L |
| API | Audit logging | Correlated security/decision events | EVID-0033, EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Best-effort and process-local paths coexist | Make consequential audit writes durable | L |
| Provider | Provider abstraction | Replaceable contract and normalization | EVID-0021 | IMPLEMENTED | MEDIUM | Adoption not universal | Make contract canonical | M |
| Provider | Hopae adapter | Init, verify, normalize, health, timeout/retry | EVID-0022 | BLOCKED BY CREDENTIALS | HIGH | Live sandbox transaction unavailable | Execute approved sandbox suite | M |
| Provider | Hopae webhook | Signature, timestamp, idempotency and persistence | EVID-0022-EVID-0023 | BLOCKED BY CREDENTIALS | HIGH | Source/test evidence, no live callback | Run negative and replay callback tests | M |
| Provider | World ID | Server-side proof verification | EVID-0024 | MISSING | HIGH | Route explicitly states exchange absent | Implement provider verification | L |
| Provider | Stripe Identity | Verification session and webhook contract | EVID-0025 | DOCUMENTED ONLY | HIGH | Billing Stripe exists; Identity workflow not verified | Implement only after provider decision | L |
| Provider | Other identity providers | Real init/verify/webhook/fallback | EVID-0025 | DOCUMENTED ONLY | MEDIUM | Mostly registry/factory entries | Remove claims or implement one at a time | XL |
| Provider | Media/deepfake providers | Real inference and calibrated outputs | EVID-0025, EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Adapters/heuristics/mocks lack transactions/calibration | Validate provider-backed slice | XL |
| Provider | Provider health | Retained fleet health and alerts | EVID-0022-EVID-0023, EVID-0048 | PARTIALLY IMPLEMENTED | HIGH | Hopae schema exists; other health process-local | Centralize provider telemetry | L |
| Identity | Document/passport verification | Provider-backed document result | EVID-0024-EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Passport product record is not document verification | Connect supported provider evidence | L |
| Identity | Email verification | Supabase verified-email evidence | EVID-0010-EVID-0011 | BLOCKED BY CREDENTIALS | HIGH | Runtime present; delivery/test account unavailable | Execute auth E2E | S |
| Identity | Phone verification | Verified phone provider/workflow | Identity inventory | MISSING | MEDIUM | No credible implementation | Design only if required | L |
| Identity | Device intelligence | Stable device signals/attestation | EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Heuristic/device continuity structures, no verified attestation | Define privacy-safe provider/native path | XL |
| Identity | Location/VPN intelligence | Verified IP/location/proxy signal | EVID-0027 | PARTIALLY IMPLEMENTED | MEDIUM | Hash/risk fields and heuristics, no reputation provider proof | Add explicit provider contract | L |
| Identity | Liveness/biometric match | Provider-backed liveness and face match | EVID-0025-EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Models/scores exist; live provider/calibration absent | Integrate and validate provider evidence | XL |
| Identity | Proof of human | Verified World/Hopae result | EVID-0022, EVID-0024 | PARTIALLY IMPLEMENTED | HIGH | Hopae blocked; World exchange missing | Narrow to credentialed Hopae evidence | L |
| Identity | Provider consensus | Multi-provider normalized consensus | EVID-0026 | PARTIALLY IMPLEMENTED | HIGH | Library/test logic; not a persistent canonical service | Integrate into identity workflow | L |
| Identity | Identity confidence | Versioned score, reasons and calibration | EVID-0026-EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Multiple heuristic scores, no canonical calibration | EPIC 17 after Stage 0-3 | XL |
| Identity | Revocation/expiry | Evidence lifecycle applied to decisions | EVID-0023, EVID-0030 | PARTIALLY IMPLEMENTED | HIGH | Fields/logic exist; universal enforcement absent | Canonical lifecycle contract | L |
| Identity | Agent identity | Owner, claims, registry and runtime identity | EVID-0018-EVID-0019, EVID-0027 | PARTIALLY IMPLEMENTED | HIGH | Tenant input untrusted; claims not verified universally | Bind to authoritative tenant/provider evidence | XL |
| Trust | Evidence normalization | Canonical typed evidence | EVID-0021-EVID-0023 | PARTIALLY IMPLEMENTED | HIGH | Strong provider path, legacy evidence remains | Version one envelope and migrate callers | L |
| Trust | Evidence Store | Durable, scoped evidence persistence | EVID-0023, EVID-0028 | PARTIALLY IMPLEMENTED | HIGH | Multiple tables and incomplete canonical use | Consolidate retention/access contract | XL |
| Trust | Evidence Graph | Relations, persistence, query, UI, tests | EVID-0028 | PARTIALLY IMPLEMENTED | HIGH | Competing graph implementations | Select canonical model/query API | L |
| Trust | Replay | Ordered deterministic reconstruction | EVID-0029 | PARTIALLY IMPLEMENTED | HIGH | Partial persistence and multiple replay paths | Version/persist all consequential events | XL |
| Trust | Trust Memory | Append-only history, decay, isolation | EVID-0030 | PARTIALLY IMPLEMENTED | HIGH | Demo/process-local and durable paths coexist | Canonicalize and test lifecycle | XL |
| Trust | ORI | Versioned scoring, validation and shadow telemetry | EVID-0031 | PARTIALLY IMPLEMENTED | HIGH | Synthetic calibration and shadow-only readiness | Run representative calibration/governance | L |
| Trust | Policy layer | Versioned policy evaluation | Decision/policy sources; EVID-0032 | PARTIALLY IMPLEMENTED | HIGH | Multiple policy engines and uneven persistence | Select canonical evaluator | L |
| Trust | Trust Decision Engine | States, reasons, persistence, override | EVID-0032 | PARTIALLY IMPLEMENTED | HIGH | Competing contracts; override not universal | Consolidate versioned decision record | XL |
| Trust | Trust reports/audit APIs | Scoped reports, receipts and exports | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Canonical data/format and tenant tests incomplete | Bind to canonical evidence/tenant | L |
| Enterprise | Public website | Navigable canonical buyer surface | EVID-0005-EVID-0008, EVID-0046 | PARTIALLY IMPLEMENTED | MEDIUM | Exhaustive accessibility/performance crawl absent | Add browser quality gate | M |
| Enterprise | Pricing/access/pilot | Buyer intake and pilot journey | EVID-0034 | PARTIALLY IMPLEMENTED | MEDIUM | No completed design-partner outcome | Execute controlled workflow after containment | L |
| Enterprise | Dashboard/Governance | Protected data-backed operations | EVID-0007, EVID-0034-EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Tenancy/demo/canonical data gaps | Bind to authoritative data | L |
| Enterprise | Back Office | Protected admin operations | EVID-0012, EVID-0034 | PARTIALLY IMPLEMENTED | HIGH | Allowlist/shared-code model and broad queries | Implement roles and scoped queries | L |
| Enterprise | Reports/exports | Authorized, consistent enterprise artifacts | EVID-0035 | PARTIALLY IMPLEMENTED | HIGH | Data contract and tenant tests incomplete | Canonical export service/tests | M |
| Enterprise | Provider health/alerts | Live retained provider operations | EVID-0023, EVID-0048 | PARTIALLY IMPLEMENTED | HIGH | Narrow Hopae source path; no tested alerts | Connect central observability | L |
| Enterprise | Demo separation | No silent Production substitution | EVID-0034 | PARTIALLY IMPLEMENTED | HIGH | Several pages fall back to demo/static data | Fail explicitly in Production | M |
| Enterprise | Accessibility | WCAG-oriented automated/manual evidence | EVID-0040 | MISSING | MEDIUM | No Playwright/axe or recorded manual audit | Add browser/axe suite | M |
| Enterprise | Product analytics | Consent-aware governed analytics | Repository/docs inventory | MISSING | MEDIUM | No approved consent/event platform | Implement only after privacy approval | L |
| Security | Secret storage/use | No committed secrets; server-only service role | EVID-0037-EVID-0038 | PARTIALLY IMPLEMENTED | HIGH | External inventory/rotation unavailable | Verify platform scopes/rotation | S |
| Security | Webhook security | Signature, timestamp and replay controls | EVID-0022, EVID-0036 | PARTIALLY IMPLEMENTED | HIGH | Uneven credentialed negative evidence | Add enforced webhook suites | M |
| Security | Bot protection | Turnstile server verification | Environment/routes; EVID-0038 | BLOCKED BY CREDENTIALS | MEDIUM | Keys and live behavior unavailable | Execute safe negative/positive flow | S |
| Security | Browser headers | CSP/HSTS/frame/MIME/referrer/permissions | EVID-0039 | PARTIALLY IMPLEMENTED | HIGH | CSP permits unsafe directives | Move to nonce/hash CSP | L |
| Security | Cloudflare controls | DNS/TLS/DNSSEC/WAF/bot/rate limits | EVID-0047 | BLOCKED BY EXTERNAL CONFIGURATION | HIGH | Only proxy/header evidence available | Conduct dashboard review | S |
| Security | Dependency hygiene | Current production advisory status | EVID-0042 | IMPLEMENTED | MEDIUM | No continuous gate | Add CI/scheduled audit | S |
| Security | Privacy/retention | Rights, minimization, deletion/retention enforcement | Provider/data-rights sources | PARTIALLY IMPLEMENTED | HIGH | Policies and paths exist; universal enforcement unproven | Map data lifecycle and tests | L |
| Testing | Unit/domain tests | Executable domain behavior | EVID-0040-EVID-0041 | PARTIALLY IMPLEMENTED | MEDIUM | Source-text assertions dilute behavioral evidence | Prioritize behavior/contract tests | L |
| Testing | API integration | Real request/auth/data tests | EVID-0040 | PARTIALLY IMPLEMENTED | HIGH | Sparse full-stack API execution | Add isolated integration environment | L |
| Testing | Database/RLS | Migration and two-tenant denial tests | EVID-0040 | BLOCKED BY CREDENTIALS | CRITICAL | Opt-in/live and does not catch team policy in default chain | Add ephemeral/default RLS suite | M |
| Testing | Provider/webhook | Contract, negative, idempotency tests | EVID-0022, EVID-0040 | PARTIALLY IMPLEMENTED | HIGH | Stronger source tests than live transactions | Add credentialed sandbox gate | M |
| Testing | Browser E2E/accessibility | Protected workflows and a11y | EVID-0040 | MISSING | HIGH | No browser suite | Add Playwright/axe | L |
| Testing | Load/performance | Representative protected load budgets | EVID-0040 | PARTIALLY IMPLEMENTED | MEDIUM | Opt-in harness, limited environment proof | Add approved staging/load evidence | M |
| Testing | Production smoke | Safe canonical post-deploy checks | EVID-0046, operations docs | PARTIALLY IMPLEMENTED | HIGH | Public/auth redirect checked; authenticated/provider flows blocked | Automate safe smoke suite | M |
| CI/CD | Pull-request CI | Enforced lint/type/test/build/security | EVID-0043 | DOCUMENTED ONLY | HIGH | No workflow | Implement/pin least-privilege workflow | M |
| CI/CD | Migration validation | Static/replay/drift gate | EVID-0020, EVID-0043 | DOCUMENTED ONLY | HIGH | No automated gate | Add static then ephemeral checks | M |
| CI/CD | Deployment controls | Main-only Production and protected preview | EVID-0044-EVID-0045 | BLOCKED BY EXTERNAL CONFIGURATION | HIGH | Deployment ready; policy settings unavailable | Review Vercel/Git settings | S |
| Deployment | Canonical Production | Ready deployment and domains | EVID-0044-EVID-0046 | IMPLEMENTED | HIGH | Latest commit metadata not exposed in captured output | Retain Git/deploy correlation evidence | XS |
| Deployment | Production environment | Complete scoped env configuration | EVID-0038, EVID-0045 | BLOCKED BY EXTERNAL CONFIGURATION | HIGH | CLI did not prove required-name completeness | Review names only; never export values | S |
| Deployment | Cloudflare routing | Proxy/canonical response behavior | EVID-0047 | PARTIALLY IMPLEMENTED | HIGH | Dashboard policy unavailable | Verify and record controls | S |
| Operations | Health/readiness | Safe liveness/readiness/dependency checks | EVID-0046, EVID-0048 | PARTIALLY IMPLEMENTED | HIGH | Basic health; no deep readiness/SLO proof | Define bounded readiness contract | M |
| Operations | Structured observability | Central logs/errors/metrics/traces | EVID-0033, EVID-0048 | PARTIALLY IMPLEMENTED | HIGH | Process-local and no central backend evidence | Implement central telemetry | L |
| Operations | Alerting | Tested severity-based alerts | EVID-0048-EVID-0049 | DOCUMENTED ONLY | HIGH | Matrix exists; no configured/drilled delivery | Configure and exercise | M |
| Operations | Incident response | Owners, severity, escalation, templates | EVID-0049 | DOCUMENTED ONLY | HIGH | No completed exercise or named on-call evidence | Run tabletop | M |
| Recovery | Application rollback | Tested prior-deployment restore | EVID-0049 | DOCUMENTED ONLY | HIGH | Runbook only | Execute safe rollback drill | M |
| Recovery | Database recovery | Backup/PITR/restore and integrity checks | EVID-0049 | BLOCKED BY EXTERNAL CONFIGURATION | HIGH | Platform state and restore unverified | Restore to isolated target | L |
| Recovery | Disaster recovery | Measured RTO/RPO and provider/domain scenarios | EVID-0049 | DOCUMENTED ONLY | HIGH | Plans unexercised | Run recovery test plan | L |
| Program | CS-ENG-002 reproducibility | Safe audit script and timestamp report | EVID-0050 | IMPLEMENTED | INFORMATIONAL | Static heuristics require human interpretation | Run at each readiness gate | XS |
| Program | EPIC 17 entry | Zero Critical blockers and approved contracts | Score/critical/roadmap reports | MISSING | CRITICAL | Stage 0 unresolved | Complete Stages 0-3, re-audit and approve | XL |

## Status distribution

This matrix intentionally favors `PARTIALLY IMPLEMENTED` where meaningful source exists but end-to-end reliability, tenant proof, credentialed provider evidence or operational enforcement is missing. `IMPLEMENTED` never implies customer/Production certification beyond the stated evidence.
