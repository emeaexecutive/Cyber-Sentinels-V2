# React 19.2.8 coordinated upgrade review

## Release guard

- Starting `main`: `dc6dd42753508145a823010e21d72012f65b5c00`.
- Local `main` matched `origin/main` after a fast-forward-only pull.
- Validation runtime: Node 22.23.1 and npm 10.9.8.
- PR #25 was already merged. Production was not accessed or changed.

## Source pull requests

### PR #20 — React DOM and React DOM types

- Current state at review: open, clean, and mergeable.
- Requested `react-dom`: 19.0.0 to 19.2.8.
- Requested `@types/react-dom`: declared range `^19.0.2` to `^19.2.4`; resolved lock version 19.2.3 to 19.2.4.
- Required transitive change: `scheduler` 0.25.0 to 0.27.0.
- Hosted state at review: Production verification, Vercel, CodeQL, Gitleaks, and Preview Comments passed.
- Release-note themes: React Server Component decoding improvements, Server Action `FormData` correction, type hardening, cycle protection, and Server Component/Server Action security hardening across the 19.2 patch line.

### PR #22 — React and React types

- Actual state at review: merged externally at `dc6dd42753508145a823010e21d72012f65b5c00`; it can no longer be closed as an open superseded PR.
- Applied `react`: 19.0.0 to 19.2.8.
- Applied `@types/react`: declared range `^19.0.4` to `^19.2.18`; resolved lock version 19.2.14 to 19.2.18.
- Hosted CodeQL and Gitleaks passed, but Production verification run `31021949481` and Vercel deployment `dpl_GrmZjyGx12VA9e4ELvcm6xS2vMdL` failed.
- Both failures occurred during Next.js page-data collection with the same error: React was 19.2.8 while React DOM remained 19.0.0. Compilation, lint, and type validation completed before the runtime version guard failed.

## Coordinated decision

The runtime packages must be released together because React requires an exact React DOM runtime match. The reviewed target is:

| Package | Target |
| --- | --- |
| `react` | 19.2.8 |
| `react-dom` | 19.2.8 |
| `@types/react` | `^19.2.18` |
| `@types/react-dom` | `^19.2.4` |

The coordinated branch is generated from current `main` with npm. Neither Dependabot lockfile is copied. Unrelated optional-platform lock metadata is preserved.

## Compatibility audit

- Next.js 15.5.21 declares React and React DOM peer support through `^19.0.0`, which includes 19.2.8.
- TypeScript 5.7 remains within the existing application configuration; no broad casts, ignores, or compiler suppressions are introduced.
- App Router Server Components remain the default. Existing client entry points retain explicit `"use client"` directives.
- Inline Server Actions retain `"use server"`; the React 19.2 patch line includes the Server Action `FormData` correction from 19.2.7.
- Supabase authentication remains server-owned where required and client-owned only on the existing login surface.
- Stripe checkout, customer portal, and webhook verification remain server routes; no Stripe package or API-version change is included.
- Turnstile retains explicit client ownership, delayed API readiness, callback token state, cleanup, reset, and hidden-field submission.
- Existing loading and error boundaries remain present. No legacy `ReactDOM.render`, `ReactDOM.hydrate`, or `findDOMNode` usage was found.
- Static generation, hydration, navigation history, protected redirects, forms, Suspense/loading behavior, and representative public/authenticated routes are validation gates for this branch.

## Regression coverage

`tests/react-19-2-8-compatibility.test.mjs` prevents runtime or type-package drift and protects representative client/server, auth, Turnstile, Stripe, form, recovery-boundary, Server Action, and route contracts. It is included in the default test preflight through `npm run test:react-upgrade`.

The required public-positioning focus check exposed an inherited Windows-only parser defect: the teaser test accepted LF but not CRLF section separators. The test now accepts both newline forms without changing positioning content.

## Local validation result

- Clean `npm ci`, lint, standalone typecheck, full default tests, and optimized build passed.
- Focused environment-safety, Turnstile/request-demo, Trust Centre, public-positioning, legacy auth/navigation, RC6 Stripe, cookie-consent, observability, security-tooling, ZAP-configuration, and release-health checks passed.
- The passive staging ZAP plan guard accepted only the workflow's non-Production staging example target; no scan or Production request was executed.
- Next.js generated all 191 static pages with no React version, client/server boundary, Server Action, or static-generation error.
- A real local headless browser rendered homepage, login/account creation, pricing, Enterprise Access, Pro waitlist, and demo with zero hydration or React errors.
- Browser history returned from pricing to login and forward to pricing with zero console/runtime errors.
- Protected Trust Centre, dashboard, and admin requests failed closed as `Protected surface unavailable.` because local auth configuration is intentionally unavailable; they produced no React error.

## Release boundary

This is a dependency-only compatibility upgrade plus review documentation and regression coverage. It does not merge automatically, deploy Production, apply a database migration, run paid Stripe operations, or alter external authentication configuration.
