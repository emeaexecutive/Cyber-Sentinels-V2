# Framework configuration

Baseline commit: `9b6fecf`

Recorded: 2026-07-18

## Next.js

Configuration file: `next.config.mjs`

- React Strict Mode is enabled.
- Permanent redirects consolidate duplicate public routes and retire the two legacy Enterprise Markdown URLs.
- Security headers apply to every path:
  - Content Security Policy;
  - `X-Frame-Options: DENY`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `X-Content-Type-Options: nosniff`;
  - two-year HSTS with subdomains and preload;
  - restrictive Permissions Policy.
- CSP allows same-origin assets and approved Supabase, Stripe, OpenAI and Cloudflare Turnstile endpoints.
- Inline styles and scripts and `unsafe-eval` remain allowed by the current CSP. Treat reduction as separate security work, not as an undocumented foundation change.

Configured permanent redirects:

- `/about-us` to `/about`;
- `/design-partners` to `/design-partner`;
- `/modern-slavery-statement` to `/modern-slavery`;
- `/trust-posture` to `/trust#trust-posture`;
- `/reality-os` and `/trust-os` to `/platform`;
- `/trust-fabric` to `/platform#trust-fabric`;
- legacy buyer documents to their native Enterprise pages.

## TypeScript

Configuration file: `tsconfig.json`

- target: `ES2017`;
- libraries: DOM, DOM iterable and ESNext;
- strict mode enabled;
- JavaScript input disabled;
- no emit;
- bundler module resolution;
- ESNext modules and preserved JSX;
- JSON modules and importing TypeScript extensions allowed;
- isolated modules and incremental builds enabled;
- `@/*` resolves to the repository root;
- Next.js type plugin enabled;
- `node_modules` excluded;
- library declaration checking is skipped.

Generated `*.tsbuildinfo` files are ignored and must not be committed.

## ESLint

Configuration file: `eslint.config.mjs`

- ESLint flat configuration using `FlatCompat`;
- extends `next/core-web-vitals` and `next/typescript`;
- ignores generated output, dependencies, coverage and browser-test artifacts;
- disables `@typescript-eslint/no-explicit-any` globally;
- the release gate requires zero ESLint errors. Existing warnings must not be increased or hidden.

## Prettier

No Prettier configuration or package is present. ESLint and existing repository style are authoritative until a formatting ADR and dependency change are approved.

## Tailwind CSS

Configuration file: `tailwind.config.ts`

- content roots: `app`, `components` and `lib` TypeScript/TSX files;
- custom `sentinel` palette for black, panel, line, white, muted and green;
- custom `glow` shadow;
- no Tailwind plugins.

## PostCSS

Configuration file: `postcss.config.js`

- Tailwind CSS plugin;
- Autoprefixer plugin.

## Middleware

Canonical entrypoint: root `middleware.ts`. No middleware directory or second middleware file exists.

Responsibilities:

1. Classify user, admin, internal-tooling and experimental paths.
2. Allow signed provider callbacks to authenticate at their route boundary.
3. Fail protected surfaces with `503` when public Supabase configuration is unavailable.
4. Resolve the current Supabase user with cookie-aware SSR auth.
5. Redirect unauthenticated users to `/login` with a safe encoded `next` path.
6. Require verified email for protected access.
7. Require configured admin allowlist membership and the verified-admin cookie for sensitive admin surfaces.
8. Preserve explicit Back Office denial paths.
9. Add private cache and `noindex` headers to protected responses.

The matcher covers all routes except generated Next.js assets and favicons.

## Layouts

- `app/layout.tsx`: global metadata, navigation access resolution, public shell and adoption rail.
- `app/enterprise/layout.tsx`: shared Enterprise navigation.
- `app/admin/founder-control/layout.tsx`: nested founder-control layout.

Nested layouts are intentional scopes, not duplicates.

## Environment configuration

`.env.example` documents public site URLs, Supabase, Turnstile, admin, World ID, Hopae, OpenAI, ORI and Stripe variables. Secret values must stay server-only and outside Git. Presence of a variable does not prove provider health, migration state or capability readiness.
