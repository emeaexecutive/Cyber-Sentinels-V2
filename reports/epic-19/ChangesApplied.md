# EPIC 19.1 Changes Applied

## Preserved existing work

The repository began dirty on `main`. All existing modifications and untracked EPIC 19/release material were preserved by creating `epic-19-enterprise-production-rc1` before editing. The preserved work includes:

- continuous trust types, deterministic engine, repository, service, HTTP boundary, APIs, dashboard, alerts, Replay, timeline, provider health, recalculation, and refresh;
- migration `202607210002_continuous_trust_runtime.sql`;
- production verification SQL and release-manager tooling;
- consent recovery lifecycle improvements and tests;
- guarded legacy `candidate_profile_id` and `status` backfills;
- repository truth, architecture, release, and prior verification evidence.

## Safe hardening performed in this audit

1. Updated `next` from 15.5.20 to 15.5.21.
2. Updated `eslint-config-next` to the matching 15.5.21.
3. Applied the non-breaking npm audit update for `brace-expansion`.
4. Added an unconditional production 404 guard to `/api/demo/seed`.
5. Added regression coverage for the production seed guard.
6. Removed normalized email addresses from admin allowlist denial logs.
7. Removed six lint warnings:
   - safely omitted receipt evidence snapshots without unused destructuring;
   - stabilized authentication event recording without changing session restoration;
   - removed unused imports/types.
8. Added the complete `reports/epic-19` audit and certification set.

## Deliberately not changed

- No architecture rewrite, provider replacement, pricing, or branding change.
- No RLS/security policy weakening.
- No migration execution or destructive database operation.
- No production environment-variable modification.
- No force audit fix, force push, merge, or deployment.
- No unsupported `sharp` override or breaking Next.js change.

