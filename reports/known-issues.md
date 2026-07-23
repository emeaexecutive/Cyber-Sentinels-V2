# Known issues

Date: 2026-07-22

## Release-environment items

- The current shell uses Node.js 26.1.0, while `package.json` and the canonical clean runner require Node.js 22.x. Repeat the clean runner under Node 22 before release.
- The hardened migration has not been applied to a linked Supabase project in this workspace. Run the canonical runner with `-RunSupabaseMigrations` only after confirming the intended project link and credentials.
- The complete `npm test` suite was not required by the acceptance criteria and was not run. Use `-RunAllTests` for the broader production gate.
- The worktree contained substantial pre-existing modified and untracked work before this task. No unrelated changes were reverted, committed, or deployed.

## Non-blocking validation warnings

Lint and the production build report six existing warnings:

- Unused `_hidden` bindings in `app/api/receipts/[id]/route.ts` and `lib/operational-trust/api.ts`.
- A missing `recordAuthEvent` hook dependency in `app/login/page.tsx`.
- Unused `TeamAccessRole` in `app/team-access/page.tsx`.
- Unused `Link` imports in `app/trust-graph-engine/page.tsx` and `app/trust/data-sovereignty/page.tsx`.
- Node test execution reports module-type reparsing warnings because `package.json` does not declare `type: module`.

These warnings did not fail lint, typecheck, consent tests, or the production build and were outside the requested repair scope.
