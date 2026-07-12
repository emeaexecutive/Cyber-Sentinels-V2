# Build and Quality Commands

Release 1.0.2 replaces the misleading `lint: next build` alias with independent, truthful gates. Next.js and `eslint-config-next` are aligned at 15.5.20; ESLint 9 uses `eslint.config.mjs` through the supported compatibility adapter.

| Command | Purpose | Truth boundary |
| --- | --- | --- |
| `npm run lint` | ESLint static analysis with Next.js core-web-vitals and TypeScript rules | Legacy `no-explicit-any` is explicitly deferred; all other configured errors fail. Warnings remain visible. |
| `npm run typecheck` | TypeScript `tsc --noEmit` | Generates no application output; incremental cache remains ignored. |
| `npm test` | Aggregates the ten genuine, existing named `test:*` commands | No empty/pass-through test command. Unconfigured historical test files are not silently promoted into the release gate. |
| `npm run build` | Next.js production build | This is the only script that invokes `next build`. |
| `npm run validate` | Lint, typecheck, tests and build in sequence | Fails on the first failed gate. |

Targeted `test:*` scripts remain available for focused diagnostics. `npm test` is the release gate because it executes every test command that was already configured before this sprint. A diagnostic `node --experimental-strip-types --test` auto-discovery run passed 104 tests and failed 14 stale contract tests whose assertions predate later shipped navigation, copy, replay and demo decisions. Those files require a separate reconciliation pass; they are not described as green.

The compatibility exception for `@typescript-eslint/no-explicit-any` prevents this reliability sprint from silently becoming a broad data-access type migration. It is recorded technical debt, not a claim that the codebase is fully strict. Existing unused-variable and hook-dependency warnings are reported by lint and should be burned down incrementally.
