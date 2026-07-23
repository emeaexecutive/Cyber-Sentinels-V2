# Production deployment report

Status: **DEPLOYED WITH EXTERNAL BLOCKERS**

Report time: 2026-07-21 14:21 CEST
Vercel deployment time: 2026-07-21 11:10:17 CEST

## Release identity

- Branch: `main`
- Local commit: `6b67dc085a668d7686b1a9b4b48ed3a1fa4bb3a9`
- `origin/main`: `6b67dc085a668d7686b1a9b4b48ed3a1fa4bb3a9`
- Commit: `feat: enterprise trust architecture epic 18`
- Vercel project: `keith-speres-projects/cyber-sentinels-v2`
- Vercel deployment ID: `dpl_3GJicUU3X6EKN1cyS5wxdsf7Lf2d`
- Immutable deployment URL: `https://cyber-sentinels-v2-gis9w9xhz-keith-speres-projects.vercel.app`
- Canonical Production URL: `https://www.cybersentinels.com`
- Vercel state: `Ready`, target `production`

The canonical `/api/ready` response reports runtime commit `6b67dc085a668d7686b1a9b4b48ed3a1fa4bb3a9`, proving that Production corresponds to the exact latest `origin/main` commit.

## Local release gate

- `npm install`: passed; production dependency audit found 0 vulnerabilities. One high-severity advisory is dev-only.
- `npm run lint`: passed with 0 errors and 6 pre-existing warnings.
- `npm run typecheck`: passed.
- `npm run test`: passed, including the strict Hopae server-verification case and EPIC 18 architecture/RLS suites.
- `npm run build`: passed with 181 static pages and the required dynamic routes.
- `npm run verify:17.1d`: passed.
- `npm run verify:17.1e`: passed.
- `npm run verify:17.2`: passed.
- `npm run verify:18`: passed.
- Conflict-marker, whitespace, duplicate-structure, tracked-environment-file and high-confidence secret scans: passed.

## Deployment path

The authorized push triggered the repository-linked Vercel Production deployment. Vercel inspection confirms that this deployment is `Ready` and owns the canonical aliases.

The requested local `vercel build --prod` prebuild was also attempted repeatedly, including a clean retry under the pinned Node 22 toolchain. It failed only in Vercel's post-Next.js lambda-grouping stage with `NEXT_MISSING_LAMBDA`, moving between unrelated static routes. No failing prebuilt artifact was deployed. The repository-linked Vercel build completed successfully and is the live Production deployment.

## Live verification

- `http://cybersentinels.com` -> 308 HTTPS redirect.
- `https://cybersentinels.com` -> 308 canonical `https://www.cybersentinels.com/` redirect.
- Homepage -> 200.
- `/login` -> 200.
- `/api/health` -> 200.
- `/api/ready` -> 503 with `NOT_READY`, `Cache-Control: no-store`, and runtime SHA verified.
- `/api/trust-architecture` unauthenticated -> 401 with `Cache-Control: private, no-store`; no 5xx.
- `/dashboard/trust-architecture` unauthenticated -> redirects to `/login?next=%2Fdashboard%2Ftrust-architecture`, then 200; no 5xx.
- `/dashboard`, `/dashboard/identity`, `/dashboard/identity/providers`, and `/dashboard/identity/operations` unauthenticated -> each redirects to its canonical `/login?next=...` target, then 200; no loops or 5xx.
- `/security` -> 200.
- `/api/operations/status` unauthenticated -> 401; no 5xx.
- CSP, HSTS, frame denial, MIME sniffing protection, referrer policy and permissions policy are present on live responses.
- Homepage HTML contains zero obvious `http://` asset or link references.
- Canonical traffic is observed through Cloudflare, but no authoritative Cloudflare control-plane configuration claim is made.

## External blockers

1. `/api/ready` reports `ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE`. The EPIC 18 Supabase migration exists in the release at `supabase/migrations/202607210001_enterprise_trust_architecture.sql`, but the authoritative data plane does not yet expose all ten active `1.0.0` trust domains.
2. External control planes remain `BLOCKED` with reason `AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED` until verified directly from those systems.
3. World ID remains `INCONCLUSIVE` with zero positive confidence because server verification is not implemented.

No Supabase migration, Vercel environment mutation, Cloudflare setting change, Stripe setting change, or unsupported provider activation was performed or claimed.

## Provider and control-plane status

- Hopae: repository safeguards are verified. Capability version `consensus-capability-v2` requires signed, server-verified, idempotent and persisted evidence before positive weight. No authenticated live provider transaction was executed, so runtime-positive status is not claimed.
- World ID: `INCONCLUSIVE`; `serverVerified` remains false, its positive consensus contribution is zero, and the Production wording remains “Proof received — server verification pending”.
- Placeholder providers: zero positive trust contribution; disabled and unsupported sources cannot create positive Evidence Objects or transitions.
- Supabase migration: `NOT_READY`; the live active trust-domain registry is incomplete.
- Production RLS: repository migration and local RLS suites passed, but Production RLS has not been verified from the authoritative Supabase control plane.
- Cloudflare: live responses traverse Cloudflare and expose the expected application security headers. WAF, DNSSEC, bot controls and rate-limiting configuration have not been verified from the authoritative Cloudflare control plane.

## Rollback

If rollback is authorized, promote the prior known-Ready Production deployment `dpl_8ELpEd3RHELLuk5Y4f1byWsBjaVa` (`cyber-sentinels-v2-q4my64xfz-keith-speres-projects.vercel.app`) using Vercel's rollback/promote workflow, then verify the canonical aliases and `/api/health`. Do not rewrite Git history; follow with a normal revert commit on `main` when source rollback is required.
