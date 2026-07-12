# Sprint 10.2 Acceptance Criteria

Status recorded after the release quality gate on 2026-07-12.

## Working software

- [x] `main` has one remote (`origin`) and one merge target (`refs/heads/main`).
- [x] `tsconfig.tsbuildinfo` is removed from the index and `*.tsbuildinfo` is ignored once.
- [x] Dependency installation succeeds with the committed lockfile.
- [x] One authenticated shell exposes Overview, Operations, Trust, Runtime, Governance, Providers and Administration.
- [x] Middleware, RLS and protected direct routes were not weakened.
- [x] Platform Health derives service states from authenticated checks, runtime samples, provider snapshots, bounded queues, a protected database query and deployment environment metadata; missing evidence is `Unknown`.
- [x] Eight safe degraded-mode messages state impact, continuation/pause, evidence state and next action.
- [x] Trust Memory™, Replay and Evidence Graph remain linked by existing routes and workflow records.

## Green build

- [x] `npm run lint` is actual ESLint analysis, not a build alias, and passes while reporting visible warnings.
- [x] `npm run typecheck` passes.
- [x] `npm test` aggregates all ten previously configured genuine Node test commands and passes.
- [x] `npm run build` passes.

## Documentation and demo

- [x] Repository recovery, quality commands, dependency risk and workspace mapping are documented.
- [x] Release notes and a production workspace demo distinguish live, configured, simulated, awaiting-credentials and unavailable states.
- [x] Allow, review and block paths remain demonstrable through existing flows.

## Permanent constraints

- [x] No force push, destructive reset, generated cache commit, fake test, forced audit repair, duplicate public navigation, new core engine, public admin exposure, or ML/provider overclaim was introduced.
- [x] About and Help remain footer-only; public Platform, Trust, Solutions and Enterprise ownership remains intact.

## Open risks

- Two moderate npm findings remain through Next's bundled PostCSS because npm offers no compatible remediation.
- World ID SDK 1.5.0 is deprecated/outdated; its provider exchange remains not implemented and requires a staged v4 migration.
- Lint reports existing warnings and temporarily defers the legacy `no-explicit-any` rule.
- Full Node auto-discovery currently passes 104 tests and fails 14 stale contract files; the configured release suite is green, but historical test reconciliation remains open.
- Queue and latency diagnostics are process-local rather than durable fleet telemetry.
- Build/deployment metadata is `Unknown` when deployment environment variables are absent.
