# Final Pilot Smoke Test

Date: 2026-06-25
Workspace: `C:\Users\emeae\Desktop\cyber-sentinels-clean`

## Result

Cyber Sentinels is locally smoke-tested for demo and pilot readiness. The product surfaces are understandable, the public/protected route separation is intact, and the production build passes.

No product features, tables, auth changes or RLS weakening were added during this smoke test.

## Supabase And RLS

Checked migration safety signals:

- No `user_metadata` or `raw_user_meta_data` references remain in migrations.
- No `team_id text references teams(id)` pattern appears in migrations.
- Recent stabilization commits added compatibility ownership columns before RLS policies/indexes reference them.
- `usage_limits.user_id` exists before the usage-limits owner policy.
- `interview_sessions.user_id` exists before `"interview sessions owner select"`.
- `session_integrity_checks.user_id` exists before `"session integrity owner access"`.
- `trust_events` policy fields are guarded before trust-event policies run.

Hosted Supabase Preview status was not directly queried from this local shell. The local migration sweep found no remaining known missing-column or unsafe-metadata blockers.

## Public UX

Homepage:

- `/` keeps the clear pilot message: "Protect enterprise workflows against synthetic identity attacks."
- Primary calls to action remain visible: View Demo and Enterprise Access.

Dropdown navigation:

- Platform dropdown points first to public explanatory pages:
  - `/governance`
  - `/verification-replay`
  - `/verification-receipts`
  - `/trust-posture`
  - `/agents`
  - `/transparency`
- Dropdown close-state logic uses `usePathname()`, resets open menu state on route change and applies close handlers on dropdown links.
- Public Platform pages are not listed in `middleware.ts` protected prefixes.

Public route separation:

- `/governance`, `/trust-posture`, `/verification-replay`, `/verification-receipts` and `/agents` are public narrative pages.
- Operational data remains deeper behind authenticated routes.

## Protected UX

Protected route boundaries remain in middleware:

- `/dashboard`
- `/workspace`
- `/passport`
- `/trust`
- `/trust-replay`
- `/agents/register`
- `/back-office`
- `/admin`
- `/api/admin/*`

Login boundary:

- `/login` explains that protected destinations contain operational trust data such as verification evidence, reviewer actions or customer workflow records.
- Protected routes preserve `next` redirects so users return to the requested operational surface after sign-in.

Admin and back-office:

- `/admin` and `/back-office` remain admin/internal surfaces.
- Runtime Validation and Admin Integrations are not in the public navigation branch.

## Demo Flow

Checked demo routes:

- `/demo`
- `/demo/hiring-attack`
- `/demo/session-integrity`

The demo story is visible:

- Fake candidate enters workflow.
- Verification begins.
- Session integrity fails.
- Governance review opens.
- Replay evidence is generated.
- Verification receipt is issued.

## Enterprise Flow

Checked enterprise routes:

- `/enterprise`
- `/enterprise-access`
- `/design-partner`
- `/enterprise/pilot`

The enterprise story remains clear:

- Hiring Security
- Session Integrity
- Governance Review
- Verification Replay
- Verification Receipts
- Design Partner / Pilot CTAs

## Runtime

Validation command:

```bash
npm run build
```

Result: passed. Next.js compiled successfully and generated 141 app routes.

## Remaining Deferred Checks

- Confirm hosted Supabase Preview status in the Supabase dashboard after the pushed migration stabilization commit is applied.
- Run a browser click-through in the deployed Preview URL once deployment finishes, including dropdown open/close behavior and protected-route login redirects.
- Validate a real enterprise-access form submission against the target Preview environment with its production environment variables.
