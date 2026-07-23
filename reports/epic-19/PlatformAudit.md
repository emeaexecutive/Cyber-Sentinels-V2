# EPIC 19.1 Platform Audit

Scope: application, components, libraries, middleware, public assets, scripts, tests, Supabase migrations, GitHub Actions, Vercel, TypeScript, ESLint, Next.js, and package manifests.

## Findings

### CRITICAL

1. **Production dependency advisory remains unresolved.** `npm audit --omit=dev` reports two high-severity findings through `sharp` 0.34.5, inherited by Next.js. The audit's automated remedy is a breaking Next.js downgrade; no safe compatible patch was applied.
2. **Production readiness endpoint fails.** `https://www.cybersentinels.com/api/ready` returns HTTP 503 with `ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE` and external controls `BLOCKED`.
3. **Authoritative migration/RLS state is unproved.** The newest trust migrations and live two-tenant RLS denial checks were not executed because linked Supabase state and test credentials were unavailable.

### HIGH

1. **Runtime-version inconsistency.** Vercel project metadata is Node 24.x; deployed application functions are Node 22.x; deployed middleware is Node 24.x. Release policy requires Node 22.x.
2. **Large production surface contains experimental/demo concepts.** The build exposes 245 page routes and 183 API routes. Middleware protects internal and experimental prefixes, but public routes such as deepfake and agent concepts must not be represented as proven detection capabilities.
3. **Provider production proof is absent.** Hopae has a real adapter, callback security, normalization, and tests, but the opt-in live sandbox check was skipped and no production provider execution was performed.

### MEDIUM

1. `/api/admin/access` uses an authenticated allowlist plus an access code, but has no route-local distributed rate limiter and compares the submitted code with a normal string comparison.
2. `lib/security.ts` and `lib/bot-protection.ts` use process-local rate-limit maps. These do not provide a global limit across serverless instances.
3. CSP permits `'unsafe-inline'` and `'unsafe-eval'` for scripts. This is broader than an enterprise production posture should retain.
4. A historical migration drops `evidence_url` after backfill. It is guarded but irreversible without backup.
5. SSO and SCIM are readiness concepts/documentation rather than production-proven integrations.
6. Backup/restore and disaster-recovery material exists, but no recent restore exercise evidence was found.

### LOW

1. Node's TypeScript-strip test path emits `MODULE_TYPELESS_PACKAGE_JSON` warnings because the package does not declare `"type": "module"`.
2. Vercel uses `npm install`, while deterministic CI uses `npm ci`.
3. Several compatibility-era trust routes coexist with the authoritative EPIC 18/19 path. Repository truth documentation constrains them, but continued duplication increases maintenance risk.

### INFORMATIONAL

- No `dangerouslySetInnerHTML` usage was found.
- No `TODO` or `FIXME` markers were found in the scanned production TypeScript/JavaScript roots.
- Secret scanning in the EPIC verifiers found no high-confidence committed secret.
- Security headers, canonical redirect logic, HSTS, frame denial, referrer policy, content-type denial, and permissions policy are configured.
- Production seed behavior was hardened to return 404 before considering `ENABLE_DEMO_SEED`.

## Production-ready implementations

- Next.js build and TypeScript compilation.
- Supabase session plumbing and protected middleware boundaries.
- Signed provider callbacks, correlation, idempotency, normalized evidence, and tenant-aware repositories.
- Consent state separation, retry lifecycle, signed cookies, and fail-closed optional tracking.
- Canonical Trust Events, decision lineage, continuous trust assessment, bounded runtime APIs, and static RLS contracts.
- Canonical host redirect and public legal/security pages.

## Partial or incomplete implementations

- Live provider verification and production provider health proof.
- Live Supabase migration and multi-tenant RLS execution.
- Production readiness domain registry.
- Distributed rate limiting and operational monitoring.
- SSO, SCIM, backup restore exercise, incident exercise, and external notification integrations.
- Production certification claims and provider-independent external validation.

## Mock, demo, and compatibility boundaries

- Demo UI/data modules are widespread and intentionally identified as demo or simulated.
- `lib/detection/providers/mock-provider.ts` is not production evidence.
- The production seed endpoint is built but now returns 404 in production.
- Provider normalization and proprietary decision logic must not be described as proprietary document, biometric, liveness, or deepfake detection.

