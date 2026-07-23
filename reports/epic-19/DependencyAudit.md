# EPIC 19.1 Dependency Audit

## Commands

- `npm audit --omit=dev`
- `npm audit`
- `npm outdated`
- `npm audit fix` (non-force only)

All package operations used Node 22.23.1.

## Applied updates

| Package | Before | After | Reason |
|---|---:|---:|---|
| `next` | 15.5.20 | 15.5.21 | Removes listed Next.js framework advisories |
| `eslint-config-next` | 15.5.20 | 15.5.21 | Keep framework lint rules aligned |
| `brace-expansion` transitive copies | vulnerable | patched by non-force audit fix | Development DoS advisory |

## Remaining production advisory

`npm audit --omit=dev` reports:

- `sharp` below 0.35.0;
- two high-severity inherited libvips vulnerability findings;
- dependency path through Next.js 15.5.21 / `sharp` 0.34.5.

The automated remedy proposes a breaking Next.js downgrade. `npm audit fix --force` was not run. A direct `sharp` minor override was not applied because 0.x minor updates can be breaking and compatibility with this Next.js release was not established.

## Notable outdated dependencies

- `@supabase/ssr` 0.5.2 → 0.12.3 is a material change and was not applied.
- `@supabase/supabase-js` installed 2.105.4, wanted/latest 2.110.8.
- `@worldcoin/idkit` 1.5.0 is deprecated and latest is 4.2.1; migration is architectural.
- Next.js 16, React 19.2, Tailwind 4, ESLint 10, TypeScript 7, and Lucide 1.x are major or broad compatibility changes and were not applied.
- Low-risk direct patches such as Stripe, PostCSS, and type packages were not necessary to close a verified production blocker in this pass.

## Compatibility

- Repository requires Node 22.x.
- Local build passes on Node 22.23.1.
- Current Vercel application functions use Node 22.x, but middleware and project metadata use Node 24.x.

## Outcome

**DEPENDENCY GATE BLOCKED** by the remaining high-severity production `sharp` advisory.

