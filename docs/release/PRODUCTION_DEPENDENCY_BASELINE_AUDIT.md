# Production Dependency Baseline audit

## Release guard

- Repository: `emeaexecutive/Cyber-Sentinels-V2`.
- Starting `main`: `dc6dd42753508145a823010e21d72012f65b5c00`; local and `origin/main` matched after a fast-forward-only pull.
- Branch: `chore/production-dependency-baseline`.
- Evidence runtime: Node 22.23.1 and npm 10.9.8.
- The starting worktree was clean. `.env.example` is the only tracked environment file; no secret-bearing file was introduced.
- Open PR #26 is an independent draft product change. It need not merge before this dependency baseline. Open dependency PRs #19 and #27 are supersession candidates only after this Epic's draft PR exists.
- Production and staging remain distinct. No deployment, database connection, migration, or Production mutation is part of this audit.

## Baseline decision

The final baseline contains 18 direct packages and 466 locked package instances. React is coordinated at 19.2.8, Stripe is coordinated at 22.4.0 with its matching API version, the already-merged PostCSS/Autoprefixer pair is retained, and security actions are immutable. The deprecated, unreferenced `@worldcoin/idkit` direct dependency is removed with its 76 exclusively reachable transitive package instances.

## Direct dependency matrix

Versions below are resolved lock versions. Classification is included in the decision column.

| Package | Current version | Proposed version | Direct/transitive | Runtime/dev/build/CI | Reason used | Risk | Upgrade decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@supabase/ssr` | 0.5.2 | 0.5.2 | Direct | Runtime | Auth cookie clients and middleware | High | Required; retain |
| `@supabase/supabase-js` | 2.105.4 | 2.105.4 | Direct | Runtime/release | Database, auth, server and validation clients | High | Required; retain |
| `@worldcoin/idkit` | 1.5.0 | Removed | Direct | Unused runtime candidate | No import, dynamic import, config, CLI, test or reflection use; World ID exchange is deliberately unimplemented | Low after tests | Obsolete/proven unused; remove |
| `lucide-react` | 0.468.0 | 0.468.0 | Direct | Runtime | Product icon rendering | Low | Required but replaceable; retain |
| `next` | 15.5.21 | 15.5.21 | Direct | Runtime/build | App Router framework | Critical | Required; retain exact |
| `react` | 19.2.8 | 19.2.8 | Direct | Runtime | UI and Server Component runtime | Critical | Required; retain exact |
| `react-dom` | 19.0.0 | 19.2.8 | Direct | Runtime | DOM/server rendering paired with React | Critical | Required; coordinate exact |
| `stripe` | 22.2.0 | 22.4.0 | Direct | Runtime | Checkout, portal, subscription and webhook SDK | Critical | Required; isolated coordinated upgrade |
| `@types/node` | 22.19.19 | 22.19.19 | Direct | Development | Node type contracts | Low | Development-only; retain |
| `@types/react` | 19.2.18 | 19.2.18 | Direct | Development | React type contracts | Medium | Development-only; pin exact |
| `@types/react-dom` | 19.2.3 | 19.2.4 | Direct | Development | React DOM type contracts | Medium | Development-only; coordinate exact |
| `autoprefixer` | 10.5.4 | 10.5.4 | Direct | Build | Browser prefix generation | Medium | Build-only; retain coordinated result |
| `eslint` | 9.39.4 | 9.39.4 | Direct | Development/CI | Static analysis | Medium | Development-only; retain |
| `eslint-config-next` | 15.5.21 | 15.5.21 | Direct | Development/CI | Next.js lint contract | Medium | Development-only; retain exact |
| `postcss` | 8.5.25 | 8.5.25 | Direct | Build | Tailwind/PostCSS transformation | Medium | Build-only; retain exact coordinated result |
| `supabase` | 2.110.0 | 2.110.0 | Direct | Development/release | Local CLI and migration tooling | High | CLI-only; retain exact |
| `tailwindcss` | 3.4.17 | 3.4.17 | Direct | Build | Production CSS generation | Medium | Build-only; retain |
| `tsx` | 4.23.1 | 4.23.1 | Direct | Development/test/release | TypeScript test and release scripts | Medium | Development-only; retain |
| `typescript` | 5.9.3 | 5.9.3 | Direct | Development/build | Compiler and type checking | High | Development/build-only; retain |

## Material transitive decisions

| Package | Current version | Proposed version | Direct/transitive | Runtime/dev/build/CI | Reason used | Risk | Upgrade decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `scheduler` | 0.25.0 | 0.27.0 | Transitive | Runtime | Required by React DOM 19.2.8 | High | Accept coordinated runtime change |
| `brace-expansion` | 1.1.16 | 1.1.18 | Transitive | Development/CI | ESLint minimatch path | Medium | Targeted npm update within parent range |
| `brace-expansion` | 5.0.7 | 5.0.9 | Transitive | Development/CI | TypeScript ESLint minimatch path | Medium | Targeted npm update within parent range |

## Unused dependency review

`@worldcoin/idkit` was checked across source imports, dynamic imports, generated code, configuration, CLI scripts, workflows, tests and runtime-reflection patterns. Only the manifest and historical reports referenced the package name. Current World ID routes accept no positive verification state and explicitly report that provider exchange is not implemented. Removal therefore changes no implemented capability. No other direct dependency met the proof threshold for removal; nothing classified unknown was removed.

## Dependency graph integrity

- Lockfile version: 3.
- `npm ls --all`: exit 0, with no invalid or unmet package. npm reports `@img/sharp-wasm32` and its `@emnapi/runtime` dependency as extraneous on this Windows install even though they are Sharp optional-platform fallback packages; `npm ls --omit=optional` is clean. The regression gate permits only those exact entries.
- React instances: one, version 19.2.8.
- React DOM instances: one, version 19.2.8.
- Stripe instances: one, version 22.4.0.
- Deprecated installed packages after removal: zero.
- Optional Linux `libc` metadata is retained for Sharp and Next.js platform packages despite npm-on-Windows metadata churn.
- Node 22 is supported by all direct packages. Stripe requires Node 18 or later; Next.js and Sharp requirements are satisfied.

## CSS evidence

PostCSS 8.5.14 plus Autoprefixer 10.4.20 generated 64,037 bytes of minified CSS at pre-upgrade commit `89d0d5b`. The coordinated PostCSS 8.5.25 plus Autoprefixer 10.5.4 result generated 64,239 bytes: an explained increase of 202 bytes (0.32%), well below a major-growth threshold. The final Next.js production CSS is 64,254 bytes and reproduced byte-for-byte. Structural tests confirm Tailwind content paths and both PostCSS plugins remain active. The browser audit found and corrected an Enterprise Access grid min-width overflow; the final mobile homepage and form surface have no horizontal overflow.

## Tooling inventory

- Runtime: Next.js, React, React DOM, Supabase clients, Stripe and Lucide.
- Build: TypeScript, Tailwind CSS, PostCSS, Autoprefixer and Next.js SWC/Sharp transitives.
- Test: Node test runner and `tsx`; no separate browser-test package is installed.
- Security: pinned Gitleaks and CodeQL workflows plus local Gitleaks/ZAP configuration tests.
- Observability: application-owned operational monitoring; no direct third-party observability SDK.
- Release: Supabase CLI and repository-owned release manager scripts.

## Boundary

This audit changes dependencies, tests, supply-chain configuration and internal release evidence only. It adds no product capability and does not touch Production.
