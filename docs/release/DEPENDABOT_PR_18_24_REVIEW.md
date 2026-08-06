# Dependabot PR #18–#24 review

Review date: 2026-08-05. Statuses are the actual GitHub states observed from current `main`.

| PR | Title and exact change | Head / base SHA | Files | Release/security review | CI and Vercel | Compatibility risk | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #18 | Gitleaks action `dcedce43…` → `ff98106e…` | `09505bd` / `89d0d5b` | `.github/workflows/secret-scan.yml` | Security-relevant pinned action update; resolved commit is the signed `v2.3.9` tag target | All repository checks and Vercel passed | Low; permissions and full-history scan preserved | Already merged; accept, then retain immutable pin |
| #19 | Stripe 22.2.0 → 22.4.0 | `aaea4df` / `dc6dd42` | `package.json`, `package-lock.json` | Changes SDK pinned API type from `2026-05-27.dahlia` to `2026-07-29.dahlia`; generated resources/types also change | CodeQL and Gitleaks passed; verify and Vercel failed on the stale application API version | High payment/type boundary | Close after Epic 35 replacement; owner review required |
| #20 | React DOM 19.0.0 → 19.2.8; React DOM types resolved 19.2.3 → 19.2.4; Scheduler 0.25.0 → 0.27.0 | `84141ba` / `dc6dd42` | `package.json`, `package-lock.json` | React Server Component, Server Action and type patch line; unsafe alone | All repository checks and Vercel passed in isolation | Critical if React/DOM differ | Closed after coordinated #27 existed; superseded again by Epic 35 baseline |
| #21 | PostCSS 8.5.14 → 8.5.25 | `50b9b94` / `89d0d5b` | `package.json`, `package-lock.json` | CSS parser/build patch line | All repository checks and Vercel passed | Medium; must be assessed with Autoprefixer/Tailwind | Already merged; accept only as coordinated CSS result with #23 |
| #22 | React 19.0.0 → 19.2.8; React types resolved 19.2.14 → 19.2.18 | `feddbd4` / `a2bdd4b` | `package.json`, `package-lock.json` | Includes Server Action FormData correction and RSC hardening | CodeQL/Gitleaks passed; verify run `31021949481` and Vercel failed on React 19.2.8 / React DOM 19.0.0 | Critical; demonstrated runtime mismatch | Already merged; corrective coordinated baseline required |
| #23 | Autoprefixer 10.4.20 → 10.5.4 | `86f1f9e` / `89d0d5b` | `package.json`, `package-lock.json` | Prefix/parser fixes including duplicate-rule correction | All repository checks and Vercel passed | Medium; must be assessed with PostCSS/Tailwind | Already merged; accept only as coordinated CSS result with #21 |
| #24 | CodeQL action major tag 3 → version tag 3.37.4 | `df96c57` / `89d0d5b` | `.github/workflows/codeql.yml` | CodeQL bundle 2.26.2 and action fixes; security critical | All repository checks and Vercel passed | Low functionality risk; mutable tag remains supply-chain risk | Already merged; pin 3.37.4 to immutable `dfbc616…` |

## Exact failure findings

PR #19 is not a Stripe runtime regression. Both its production-verification log and actual Vercel log fail at `lib/billing/stripe.ts` because Stripe 22.4.0 accepts only `2026-07-29.dahlia` while the application explicitly requested `2026-05-27.dahlia`. Epic 35 updates both together and tests raw-body signature verification, idempotency, checkout, portal, subscriptions and safe failures. No live checkout claim is made without test credentials.

PR #22 failed during Next.js page-data collection because React was 19.2.8 while React DOM remained 19.0.0. Epic 35 applies the same coordinated runtime correction already validated by draft PR #27.

## Current open PR inventory

- #19: Stripe Dependabot PR; replacement required.
- #26: independent Enterprise Trust Learning product draft; no prerequisite dependency upgrade.
- #27: coordinated React draft; its equivalent changes are incorporated into Epic 35, after which #27 can be closed as superseded.

No original PR is merged automatically by this Epic.
