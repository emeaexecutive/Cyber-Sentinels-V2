# Sprint 10.1 Acceptance Criteria

Release: 1.0 Alpha
Status: complete with authenticated visual QA recorded as a manual deployment check

## Working software

- [x] One authenticated Enterprise Trust OS shell wraps existing operational routes.
- [x] Overview, Operations, Trust, Runtime, Governance, Providers and Administration have canonical destinations.
- [x] One global context bar contains all six required dimensions.
- [x] Unified search covers all required entity and evidence categories through existing protected destinations.
- [x] `Ctrl+K` / `Cmd+K` opens quick navigation, search, actions and investigations.
- [x] Platform status persists across authenticated pages with truthful measurement boundaries.
- [x] Notification Center is persistent and alerts are not duplicated in the shell.
- [x] Public navigation and protected administration remain separate.
- [x] Shared loading boundaries cover the main authenticated areas.

## Green build

- [x] `npm run lint` (repository script executes the full Next production build).
- [x] `npm run typecheck`.
- [x] `npm run test:trust-os` (7 checks).
- [x] All nine existing named suites (54 checks).
- [x] `npm run build` (154 static pages generated).

## Documentation and demo

- [x] Enterprise Workspace documentation.
- [x] Trust OS documentation.
- [x] Navigation documentation.
- [x] Component standards.
- [x] Under-five-minute Enterprise Trust OS walkthrough.

## Boundaries

- [x] No parallel dashboard, search index, notification store or trust engine was introduced.
- [x] No auth, middleware, RLS or admin verification path was weakened.
- [x] Missing status remains `Awaiting data`.
- [x] Provider and validation states remain bounded by evidence.

## Deployment check

The in-app browser controller and a live authenticated Supabase session were not available in this execution environment. Desktop/mobile shell rendering, `Ctrl+K` interaction and real tenant context should receive a short authenticated visual QA pass in preview. Source contracts, responsive breakpoints, loading boundaries, authorization separation, TypeScript and production rendering passed locally.
