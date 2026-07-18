# Platform stack

Baseline commit: `9b6fecf`

Recorded: 2026-07-18

## Runtime and framework

| Concern | Declared value | Source |
| --- | --- | --- |
| Framework | Next.js App Router | `next` dependency and `app/` |
| Next.js | `15.5.20` | `package.json` |
| React | `19.0.0` | `package.json` |
| React DOM | `19.0.0` | `package.json` |
| TypeScript | `^5.7.2` | `package.json` |
| Package manager | npm | `package-lock.json` |
| Lockfile | npm lockfile version 3 | `package-lock.json` |
| Node version | Not declared | No `engines`, `.nvmrc` or `.node-version` |
| Package-manager version | Not pinned | No `packageManager` field |

Discovery ran with Node `v26.1.0` and npm `11.13.0`. Those are observed workstation versions, not repository requirements. CI and deployment must use an explicitly approved Node version before this document can call it canonical.

## Production dependencies

| Package | Version | Role |
| --- | --- | --- |
| `@supabase/ssr` | `^0.5.2` | Cookie-aware server and browser Supabase clients |
| `@supabase/supabase-js` | `^2.48.1` | Supabase API and service-role access |
| `@worldcoin/idkit` | `^1.3.0` | Optional World ID client integration |
| `lucide-react` | `^0.468.0` | Icon components |
| `next` | `15.5.20` | Web framework, routing and build |
| `react` | `19.0.0` | UI runtime |
| `react-dom` | `19.0.0` | DOM renderer |
| `stripe` | `^22.2.0` | Server-side billing integration |

## Development dependencies

| Package | Version | Role |
| --- | --- | --- |
| `@types/node` | `^22.10.5` | Node type declarations |
| `@types/react` | `19.0.4` | React type declarations |
| `@types/react-dom` | `19.0.2` | React DOM type declarations |
| `autoprefixer` | `^10.4.20` | PostCSS vendor prefixing |
| `eslint` | `^9.17.0` | Static analysis |
| `eslint-config-next` | `15.5.20` | Next.js ESLint rules |
| `postcss` | `^8.4.49` | CSS processing |
| `tailwindcss` | `^3.4.17` | Utility CSS generation |
| `typescript` | `^5.7.2` | Type checking |

## Scripts

| Script | Command / purpose |
| --- | --- |
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint .` |
| `typecheck` | `tsc --noEmit` |
| `test` | Chained repository suite covering providers, trust, Enterprise and RC1-RC7 gates |
| `validate` | `npm run lint && npm run typecheck && npm test && npm run build` |
| `test:providers` | Provider abstraction tests |
| `test:provider-rls` | Provider RLS tests |
| `test:hopae` | Hopae assurance and provider integration tests |
| `test:hopae-live` | Credentialed Hopae sandbox harness; not part of default tests |
| `check:hopae` | Hopae deployment-readiness diagnostic |
| `test:detection` | Detection sovereignty tests |
| `test:ml-validation` | ML validation foundation tests |
| `test:ori` | Operational Risk Intelligence tests |
| `test:ori-rls` | ORI RLS tests |
| `validate:ori` | ML validation, ORI and ORI RLS chain |
| `test:trust-explanation` | Trust explanation tests |
| `test:decision-intelligence` | Decision intelligence tests |
| `test:standards-readiness` | Standards-readiness tests |
| `test:trust-lifecycle` | Trust lifecycle tests |
| `test:continuous-trust-validation` | Lifecycle validation and local load tests |
| `test:public-surface` | Public navigation tests |
| `test:trust-os` | Enterprise Trust OS tests |
| `test:trust-fabric` | Trust Fabric tests |
| `test:enterprise-storytelling` | Enterprise story tests |
| `test:enterprise-readiness` | Enterprise operational readiness tests |
| `test:release-candidate` | Release-candidate hardening tests |
| `test:design-partner` | Design-partner readiness tests |
| `test:category-leadership` | Category-leadership tests |
| `test:enterprise-adoption` | Enterprise adoption tests |
| `test:enterprise-experience` | Focused Enterprise experience tests |
| `test:rc1` | RC1 evidence gate |
| `test:rc1-performance` | RC1 trust-assessment load test |
| `test:rc2` | RC2 living-trust tests |
| `test:rc3` | RC3 living-trust experience tests |
| `test:rc4` | RC4 Enterprise proof tests |
| `test:rc5` | RC5 operational proof tests |
| `test:rc6` | RC6 production evidence gate |
| `test:rc7` | RC7 controlled-pilot evidence gate |
| `test:deployed` | Deployed security harness; requires an explicit target environment |
| `test:rls` | RC6 RLS denial tests |
| `test:load` | RC6 load harness |
| `validation:import` | Imports approved release validation fixtures |

The default `test` script deliberately excludes credentialed live-provider, deployed-target, destructive fixture-import and standalone load commands.

## Platform integrations

- Supabase: authentication, PostgreSQL persistence, RLS and server-side administrative access.
- Cloudflare Turnstile: optional configured bot-protection challenge with server verification.
- Hopae Connect: active provider adapter when explicitly enabled and credentialed.
- World ID and Stripe Identity: registered optional identity signals; registry state must remain truthful.
- Stripe: billing checkout, portal and webhook processing.
- OpenAI: optional server-side integration where configured; credentials are not a capability claim.
