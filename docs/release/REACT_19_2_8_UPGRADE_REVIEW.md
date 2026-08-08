# React 19.2.8 coordinated upgrade review

## Source condition

`main` at `dc6dd42753508145a823010e21d72012f65b5c00` contained React 19.2.8 from merged PR #22 but React DOM 19.0.0. PR #22's production verification and Vercel deployment both failed during page-data collection on that exact mismatch. PR #20 contained the complementary React DOM change and was closed only after coordinated PR #27 existed.

## Coordinated versions

| Package | Before Epic 35 | Epic 35 baseline |
| --- | --- | --- |
| `react` | 19.2.8 | 19.2.8 exact |
| `react-dom` | 19.0.0 | 19.2.8 exact |
| `@types/react` | 19.2.18 resolved | 19.2.18 exact |
| `@types/react-dom` | 19.2.3 resolved | 19.2.4 exact |
| `scheduler` | 0.25.0 | 0.27.0 transitive |

The lockfile was regenerated from current `main` with npm; no Dependabot lockfile was copied and no conflict markers were edited.

## Compatibility review

- Next.js 15.5.21 declares React and React DOM peer support through `^19.0.0`.
- TypeScript 5.9.3 validates the resulting React 19.2 types without casts, ignores or compiler suppression.
- App Router Server Components remain the default; client entry points retain explicit `"use client"` boundaries.
- Inline Server Actions retain `"use server"`; the React patch line includes the corrected Server Action FormData handling.
- Auth, Turnstile, Stripe, public forms, loading/error boundaries, static routes, dynamic routes and API routes remain covered.
- No `ReactDOM.render`, `ReactDOM.hydrate` or `findDOMNode` use exists.
- `tests/react-19-2-8-compatibility.test.mjs` and `tests/dependency-baseline.test.mjs` prevent future split-version drift.

## Validation boundary

Two final-source clean cycles passed lint, type checking, the full suite and optimized builds. Each generated 191 static pages, 501 app paths, 230 static routes and 124 dynamic routes. Local Chrome rendered homepage, login/account creation, password recovery, pricing, Enterprise Access, design-partner, waitlist and demo surfaces with zero React or hydration errors; history back/forward passed. Local missing-auth configuration remained fail-closed. Production is not deployed or accessed.
