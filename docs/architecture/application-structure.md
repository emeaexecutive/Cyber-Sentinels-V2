# Application structure

Baseline: `0bd13f4` on 2026-07-18. This document describes the source tree; it does not assert that every source-defined route is deployed or operational.

## App Router inventory

The application uses the Next.js App Router under `app/`.

| Item | Observed count | Notes |
| --- | ---: | --- |
| Page modules | 225 | One root page plus nested product, enterprise, trust, admin and workflow surfaces. |
| Route handlers | 121 | 118 under `app/api/`, plus the auth callback, dynamic docs handler and favicon handler. |
| Layouts | 3 | Root, enterprise and founder-control scopes. |
| Loading modules | 5 | Root, dashboard, notifications, trust-center and workspace. |
| Error boundaries | 1 | Root `app/error.tsx`; no nested error boundary was found. |
| Dynamic page routes | 21 | Listed below. |
| Route groups | 0 | No `(group)` directory exists. |
| TSX modules | 235 | 7 explicit Client Components and 228 server-compatible modules. |

## Route hierarchy

The broad hierarchy is:

```text
/
|- public company and legal pages
|- /platform, /solutions, /trust, /enterprise, /developers
|- /login, /verify-email, /reset-password, /auth/callback
|- /dashboard/* and /workspace/*
|- /agents/*, /passports/*, /verification/*, /replay/*
|- /admin/* and /back-office
|- /api/*
`- experimental and internal trust surfaces
```

Largest page namespaces are `admin` (27), `enterprise` (15), `trust` (11), `dashboard` (10), `demo` (6), `verify` (6), and `developers` (5). Many additional top-level directories contain one page. Redirects in `next.config.mjs` consolidate selected historical paths, but parallel legacy or experimental source routes still exist.

Access classification is not encoded by route groups. `middleware.ts` maintains explicit public exceptions and user, admin, internal-tooling and experimental prefix lists. A new route is public unless it is added to those lists or performs its own handler/page authorization.

## Layout hierarchy

| Layout | Responsibility | Protection |
| --- | --- | --- |
| `app/layout.tsx` | Global metadata, navigation, authenticated Trust OS shell, public footer, issue reporting and adoption rail. | Reads session state for presentation. It does not replace middleware or handler authorization. |
| `app/enterprise/layout.tsx` | Adds enterprise navigation. | No intrinsic authentication check. |
| `app/admin/founder-control/layout.tsx` | Adds founder-demo shortcuts. | Relies on middleware/admin checks; the layout itself has no guard. |

The root layout is an async Server Component. It uses `getSession()` to choose navigation chrome; consequential access checks use validated users elsewhere.

## Loading and error UI

- `app/loading.tsx` is the global loading fallback.
- Namespace loading fallbacks exist for dashboard, notifications, trust-center and workspace.
- `app/error.tsx` is the only explicit error boundary and is a Client Component.
- No `global-error.tsx`, nested `error.tsx`, `not-found.tsx`, `template.tsx` or parallel-route `default.tsx` was found.

This leaves most namespaces dependent on the root error boundary and framework defaults.

## Dynamic routes

Dynamic page routes exist for admin fake actors and support cases; agents and agent runtime; embeds; interview sessions; passports; profiles; replays; seals; trust agents, hiring reports, interview reports, media, receipts and sessions; trust timeline; verification receipts; generic verification; and workspaces.

Dynamic API routes are inventoried in `docs/api/api-overview.md`. Parameters use Next.js 15 promise-based route context in newer handlers, while older styles remain present.

## Server and Client Components

Server Components are the default. They perform data loading, compose domain modules and sometimes call Supabase or provider-readiness modules directly. Explicit Client Components are limited to interaction-heavy surfaces such as login, reset/verification flows, demo lab, evidence upload and the root error boundary.

`components/` contains additional Client Components for navigation, command palette, interactive demonstrations, forms and refresh actions. Client Components must not import server-only provider or service-role modules.

## Metadata

Global metadata is exported by `app/layout.tsx`. Twenty-four page modules also export static metadata or a `generateMetadata` function, including the homepage, platform, solutions, trust, pricing, developer and enterprise pages. Metadata ownership is distributed; no central page-metadata registry exists.

## Middleware interaction

Middleware runs for all paths except Next static/image assets and favicons. It:

1. classifies protected user and admin prefixes;
2. fails protected surfaces with `503` when public Supabase configuration is missing;
3. creates an SSR Supabase client and validates the user with `auth.getUser()`;
4. redirects unverified users to `/verify-email`;
5. checks the admin email allowlist and the `cyber_admin_verified` cookie for admin surfaces; and
6. marks protected responses private and non-indexable.

Provider callback POST handling is explicitly exempted for `/api/providers` because the handler verifies its HMAC. Middleware classification is a security boundary and must be reviewed whenever routes change.

## Gaps

- Route access policy is maintained in long prefix arrays rather than colocated route metadata.
- No route groups separate public, authenticated and administrative layouts.
- Only one error boundary exists.
- Many top-level one-page namespaces increase route discoverability and ownership cost.
- Server pages frequently cross the desired service/repository boundary directly; see `service-layer.md`.
