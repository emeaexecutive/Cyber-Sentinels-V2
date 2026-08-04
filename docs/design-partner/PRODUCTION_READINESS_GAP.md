# Production readiness gap

| Gap | Current state | Required implementation | Tool dependency | Owner role | Acceptance evidence | Estimated engineering slice | Release blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Isolated staging | Existing staging release tools and tests | Preserve staging-only safety and guardrail validation | Release tooling, tests | Engineering lead | Staging release and environment-safety tests pass | Small | No |
| Live RLS | Partial local evidence | Validate RLS in staging and document results | Supabase staging | Platform engineer | Live RLS governance tests pass | Medium | Yes |
| One verified provider | Partial provider abstraction | Prove one provider integration in staging | Provider adapter | Integration engineer | Provider integration test and health evidence | Medium | Yes |
| Canonical Agent Registry | Partial | One bounded registry flow | Trust engine | Platform engineer | Registry record and evidence | Small | No |
| Authority expiry / revocation | Partial | One revocation path in staging | Trust engine | Platform engineer | Evidence and replay test | Medium | Yes |
| Trust Decision API | Present | End-to-end canonical transaction path | API route, release health | API engineer | Decision trace and health evidence | Medium | Yes |
| One runtime integration | Partial | One controlled enforcement or relay integration | Runtime engine | Integration engineer | Runtime trace evidence | Medium | Yes |
| Append-only evidence | Partial | Persist append-only evidence in staging | Evidence service | Platform engineer | Evidence write and replay proof | Medium | Yes |
| Replay | Partial | Generate replay from stored events | Replay engine | Platform engineer | Replay artifact and tests | Medium | Yes |
| Monitoring | Partial | Emit safe telemetry and health checks | Observability adapter | SRE / engineering lead | Observability tests and health API | Small | No |
| Recovery | Partial | Document runbook and release rollback path | Release tooling | Engineering lead | Runbook and health evidence | Small | No |
| Security scan | Partial | Staging ZAP plan and CodeQL/Dependabot workflow | GitHub Actions | Security engineer | Workflow and plan tests | Small | No |
| Audit export | Partial | Provide evidence export for partner review | Trust centre | Platform engineer | Export artifact and test | Medium | Yes |
