# Definition of Done

An implementation is Done only when every applicable item has evidence. “Not applicable” requires a written reason; “not run” is not a pass.

## Required quality gate

| Requirement | Evidence |
| --- | --- |
| Successful production build | `npm.cmd run build` exits zero and route generation completes |
| Zero TypeScript errors | `npm.cmd run typecheck` exits zero |
| Zero ESLint errors | `npm.cmd run lint` exits zero; warnings are recorded and not increased |
| Tests passing | Relevant focused tests and `npm.cmd test` exit zero |
| Documentation updated | Architecture, API, database, security, testing, release and product records updated as applicable |
| Security reviewed | Threats, auth, authorization, data, provider and failure behavior reviewed |
| Accessibility reviewed | Semantic, keyboard, focus, responsive and assistive-technology impact reviewed |
| Rollback documented | Exact code, deployment, migration and configuration recovery path recorded |

The repository-wide shorthand is `npm.cmd run validate`, which runs lint, typecheck, the default test suite and the production build.

## Engineering completion

- Scope matches the approved request and introduces no unrelated features.
- Code follows dependency and coding standards.
- Public and protected route ownership remains coherent.
- Error paths are explicit and do not create fabricated success states.
- External calls are authenticated as required, bounded and safely handled.
- Observability is useful, sanitized and non-blocking.
- No generated or local-only files appear in the diff.

## Data and security completion

- Inputs are validated at the trust boundary.
- Authentication and authorization are distinct and tested.
- Tenant scope is derived and enforced server-side.
- Schema changes are append-only migrations with RLS and rollback implications reviewed.
- Secrets stay server-only and out of logs, fixtures, client bundles and documentation.
- Provider evidence is normalized, minimized and never treated as automatic authorization.
- Retention, deletion and audit requirements are documented.

## User-experience completion

- Existing product behavior is preserved unless change is explicitly authorized.
- Loading, empty, blocked, error and unavailable states are truthful.
- Keyboard and focus behavior pass.
- Mobile, tablet, desktop, zoom and long-content layouts are reviewed as applicable.
- Metadata, internal links and canonical ownership are correct for public pages.
- Analytics respects approved consent and privacy controls and never blocks navigation.

## Release completion

- The approved commit and deployment identity are recorded.
- Environment and migration readiness are verified in the target environment.
- Smoke tests cover critical routes and actions.
- Known limitations and manual gates are visible.
- Stakeholder sign-off is recorded before production promotion where required.
- The repository is clean and the remote branch is synchronized after commit.

## Non-completion conditions

The work is not Done when a required check is skipped, a credentialed state is inferred from source, a blocker is hidden, manual verification is claimed without being run, or rollback would require destructive history rewriting.
