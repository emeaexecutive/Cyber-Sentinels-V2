# Repository inventory

Baseline commit: `9b6fecf`

Inventory date: 2026-07-18

Repository: `C:\Users\emeae\Desktop\cyber-sentinels-clean`

## Scope

This inventory records the repository before CS-ENG-001 Part 1 documentation was added. Counts are discovery aids, not architectural quality scores.

## Requested root inventory

| Path | Status | Baseline files | Notes |
| --- | --- | ---: | --- |
| `app/` | Present | 358 | Next.js App Router pages, layouts and route handlers |
| `components/` | Present | 46 | Shared React presentation components |
| `lib/` | Present | 262 | Domain logic, orchestration, provider adapters, persistence gateways and utilities |
| `hooks/` | Missing | 0 | No placeholder created |
| `services/` | Missing | 0 | No placeholder created; service-style modules currently live within domain folders under `lib/` |
| `providers/` | Missing | 0 | No root folder; implemented provider code lives in `lib/providers/`, `lib/identity-providers/` and `lib/detection/providers/` |
| `middleware/` | Missing | 0 | No directory; one root `middleware.ts` is the canonical Next.js middleware entrypoint |
| `supabase/` | Present | 58 | Migration source; 58 migration files were present |
| `scripts/` | Present | 5 | Deployment, load, validation and provider diagnostic harnesses |
| `tests/` | Present | 46 | Node test suites, including load and RLS subdirectories |
| `public/` | Present | 2 | Public static assets |
| `docs/` | Present | 470 | Pre-foundation documentation across eight top-level subdirectories |

The missing code directories are recorded intentionally. CS-ENG-001 Part 1 does not create empty application directories or move existing code.

## Other root entries

| Path | Purpose |
| --- | --- |
| `data/` | Repository data and controlled fixtures |
| `types/` | Shared type declarations |
| `.agents/`, `.codex/` | Local agent and workspace support metadata |
| `.next/` | Generated Next.js output; ignored |
| `.vercel/` | Local Vercel project linkage; ignored |
| `node_modules/` | Installed dependencies; ignored |
| `.env.example` | Environment variable template without production secrets |
| `.env.local` | Local ignored environment file |
| `package.json`, `package-lock.json` | Package manifest and npm lockfile |

## App Router topology

| Artifact | Count | Notes |
| --- | ---: | --- |
| `page.tsx` | 225 | Public, authenticated, administrative and internal surfaces |
| `route.ts` | 121 | API and non-page route handlers |
| `layout.tsx` | 3 | Root, Enterprise and founder-control layouts |
| Normalized page/handler route entries | 346 | Route groups and dynamic parameter names normalized during collision audit |

Layout paths:

- `app/layout.tsx`
- `app/enterprise/layout.tsx`
- `app/admin/founder-control/layout.tsx`

## Canonical configuration entrypoints

- `next.config.mjs`
- `tsconfig.json`
- `eslint.config.mjs`
- `tailwind.config.ts`
- `postcss.config.js`
- `middleware.ts`
- `.env.example`

No Prettier configuration, `.nvmrc`, `.node-version`, `packageManager` field or Node `engines` field exists at this baseline.

## Architecture-bearing directories under `lib/`

The repository has 67 top-level `lib` directories. Principal layers include:

- orchestration: `core/`, `runtime/`, `workflows/`;
- trust decisions and explanation: `trust/`, `trust-engine/`, `trust-explanation/`;
- evidence continuity: `replay/`, `trust-replay/`, `trust-memory/`, `evidence-graph/`, `trust-receipts/`;
- provider integration: `providers/`, `identity-providers/`, `detection/`, `integrations/`;
- persistence and auth: `supabase/`, `auth/`, `database/`;
- governance and validation: `governance/`, `operational-governance/`, `validation/`, `runtime-validation/`;
- operational risk: `operational-risk/`, `operational-intelligence/`;
- operations: `performance/`, `cache/`, `security/`, `webhooks/`, `release-evidence/`.

## Discovery findings

- Application pages and route handlers commonly import the internal `lib/supabase` gateway. A separate repository layer is not yet consistently present.
- Direct third-party SDK imports are concentrated in server route handlers and internal gateway modules, with two legacy API routes constructing Supabase clients directly.
- No React context provider was found through `createContext` or `useContext`; “provider” in this repository normally refers to an external verification or infrastructure provider.
- The provider registry contains nine unique provider identifiers and separates active, configured-unverified, placeholder and safely-disabled states.
- Protected navigation is enforced by the root middleware and reinforced by server-side checks on sensitive surfaces.

## Missing-directory policy

Do not create `hooks/`, `services/`, `providers/` or `middleware/` merely to satisfy a visual tree. Add a directory only with a reviewed, real implementation and an approved dependency boundary. Existing canonical modules remain in place until a separate architecture migration is authorized.
