# Sprint 12.1 Acceptance

## Acceptance matrix

| Objective | Evidence | Status | Remaining external validation |
| --- | --- | --- | --- |
| Guided onboarding | Existing `/enterprise/pilot-setup` implements seven steps and retains identity, provider, policy and admin confirmation metadata | Implemented | Credentialed tenant walkthrough |
| Provider setup | Existing `/admin/provider-status` consolidates required fields, classifications, health summaries and truthful Test Connection behavior | Implemented | Real provider connection tests |
| Policy templates | `enterprisePolicyTemplates` defines seven choices with thresholds, escalation, review and evidence rules | Implemented | Design-partner policy approval |
| Trust Workspace | `/dashboard` shows posture, decisions, evidence, Replay, Trust Memory boundary, providers, reviews and actions | Implemented | Pilot-data usability review |
| Operational visibility | Enterprise Readiness tracks ten pilot-critical components | Implemented | Production probes and fleet telemetry remain outside this release |
| Enterprise settings | Existing control surfaces are indexed under eight logical groups | Implemented | Role-based walkthrough |
| UI/UX | Duplicate provider registry and dashboard demo card removed; operational copy and cards consolidated | Implemented | In-app visual QA unavailable in this execution environment |
| Deployment readiness | Deployment checklist covers environment, secrets, Supabase, Vercel, Cloudflare, providers, webhooks and rate limiting | Implemented | Target-environment execution |
| Documentation | Five required documents and controlled demo guide exist | Implemented | Design-partner sign-off |

## Quality gate

Sprint completion requires working software, green lint/typecheck/tests/build, required documentation, a rehearsable demo and this acceptance matrix. Test results and any warnings must be recorded in the delivery report; repository success does not clear credential, dataset, legal, security or production-observability blockers.

## Verification evidence — 2026-07-15

- `npm run lint`: passed with 0 errors and 9 pre-existing warnings.
- `npm run typecheck`: passed.
- `npm test`: passed 90 tests across all configured suites.
- `npm run build`: passed; Next.js generated 154 static pages.
- In-app visual browser QA: unavailable in this execution environment and retained as a blocker below.

## Known blockers

- Provider credentials and successful real health checks are deployment-specific.
- ML accuracy remains awaiting a representative reviewed dataset; no accuracy is claimed.
- Tenant isolation, session expiry, webhook signatures and rate limits require credentialed target-environment tests.
- Production-scale performance and fleet-wide provider availability are not established by process-local measurements.
- Visual browser QA could not run because the in-app browser tool was unavailable; source review and build verification are the fallback evidence.
