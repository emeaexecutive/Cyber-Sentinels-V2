# Final Build And Admin Access Check

Date: July 7, 2026

## Admin Routes

- `/admin` - protected redirect to `/back-office`.
- `/back-office` - protected Back Office dashboard. Requires authenticated Supabase session, admin allowlist, and verified admin access cookie.
- `/admin/access` - protected access-code entry path, implemented as a redirect to `/back-office`.
- `/admin/test-lab` - protected validation and scenario test lab.
- `/admin/detection-status` - protected detection, ML readiness, provider status, and benchmark status inventory.
- `/admin/trust-execution` - protected trust execution monitor for workflow decisions, replay writes, provider orchestration, event bus, governance queue, and runtime trust events.

The authenticated navigation exposes the discreet `Operations` link only for admin/founder allowlisted accounts. It is not rendered for public visitors.

## Back-office Routes And Visibility

- `/back-office` summarizes users/profiles through safe candidate and recruiter profile counts. Supabase Auth users, passwords, session data, and credentials are not displayed.
- `/back-office` summarizes trust reports, verification cases, replay events, governance reviews, provider status, ML/detection status, and trust execution events.
- `/verification-queue` remains the operational queue surface for verification review.
- `/evidence-vault` remains the evidence review surface.
- `/decision-engine` remains the visible decision explanation surface.
- `/trust-ledger` and `/timeline` remain evidence-chain and chronology surfaces.

No raw provider tokens, bearer tokens, Supabase service-role secrets, Stripe secret keys, or external credentials are rendered in Back Office.

## ML Routes

- `/admin/detection-status` - protected status page for detection modules, provider readiness, validation dataset status, precision/recall availability, and explicit ML limitations.
- `/api/ml/status` - admin API route, protected by `requireAdminApiAccess`.
- `/api/ml/readiness` - ML readiness API route.
- `/api/ml/benchmark` - benchmark API route.
- `/admin/benchmarking` - protected benchmark review surface.

Current boundary: Cyber Sentinels does not claim first-party production ML inference unless a verified model/provider exists. Heuristic baseline, runtime intelligence, and provider readiness are labelled as review evidence, not autonomous truth or detection certainty.

## Trust Execution Routes

- `/admin/trust-execution` - protected monitor for trust execution events.
- `/demo/trust-execution-flow` - demo route for controlled execution walkthroughs.
- `/api/trust/execute` - authenticated workflow execution API.
- `/api/trust/decision` - trust decision API.
- `/api/trust/authorization` - trust authorization API.
- `/api/trust/events` - trust event API.
- `/api/replay/[id]` - replay API.
- `/replay/[id]` - replay route.
- `/trust-replay` - replay and enterprise memory surface.

Integrated execution components remain present:

- Detection status: `app/admin/detection-status/page.tsx`, `app/api/detection/status/route.ts`, `app/api/ml/status/route.ts`.
- ML readiness: `lib/validation/ml-readiness.ts`.
- Benchmark harness: `lib/validation/benchmark-harness.ts`.
- Trust algorithm: `lib/trust/trust-algorithm.ts`.
- Decision engine: `lib/trust/decision-engine.ts`.
- Workflow executor: `lib/workflows/trust-workflow-executor.ts`.
- Replay writer: `lib/replay/replay-writer.ts`.
- Provider orchestrator: `lib/providers/provider-orchestrator.ts`.
- Event bus: `lib/events/event-bus.ts`.
- Trust cache: `lib/cache/trust-cache.ts`.
- Governance queue: `lib/governance/governance-queue.ts`.

## Demo Routes

- `/demo`
- `/demo/hiring-attack`
- `/demo/session-integrity`
- `/demo/agent-tracking-flow`
- `/demo/trust-execution-flow`
- `/enterprise/walkthrough`
- `/enterprise/demo-stories`
- `/pilot/welcome`
- `/pilot/getting-started`

## Current Limitations

- Live Supabase data visibility depends on deployed schema and RLS policies.
- Provider states may be `Live`, `Simulated`, `Awaiting Credentials`, or `Disabled`; credentials alone do not prove production detection.
- Precision, recall, and F1 are only meaningful when labelled validation cases exist.
- The in-process event bus, replay queue, trust cache, and governance queue are runtime snapshots and do not replace durable database history.
- Admin access requires `ADMIN_EMAILS` and the admin access code/cookie path to be configured in the target environment.

## Security Check

- Admin routes remain protected by `checkAdminAccess`, `requireAdminPageAccess`, or `requireAdminApiAccess`.
- Public navigation does not render an admin/back-office link.
- The authenticated admin/founder navigation link is labelled `Operations`.
- Back Office displays summaries and status fields only; it does not render provider secrets or raw tokens.
- Provider keys are read only through server-side environment checks and are not exposed to the client UI.
- Existing RLS assumptions are preserved; no migration weakens RLS or opens admin data publicly.
- Restricted data egress remains blocked by server-side route protection and scoped summaries.

## Backup Instructions

PowerShell backup:

```powershell
cd C:\Users\emeae\Desktop
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
Compress-Archive -Path .\cyber-sentinels-clean -DestinationPath ".\cyber-sentinels-backup-$stamp.zip" -Force
```

Store the generated archive outside the working tree before deployment or major environment changes.
