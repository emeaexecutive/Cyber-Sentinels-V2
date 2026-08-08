# RC2 Enterprise Deployment Guide

## Scope

This guide qualifies RC2 in an isolated non-Production environment. It does not authorize Production deployment.

**Production untouched.** Do not reuse Production credentials, run Production migrations or redirect Production traffic during this procedure.

## Prerequisites

- Node.js 22.x and npm 10.x.
- A dedicated Supabase project or disposable database with the existing migration chain applied.
- A non-Production Vercel project or equivalent Node runtime.
- Separate Supabase, provider, Stripe, email, Turnstile and admin credentials for the target environment.
- Named deployment operator, security reviewer, database reviewer and rollback owner.

## Repository qualification

From the repository root:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Retain the commit SHA, Node/npm versions, command output, start/end time, operator and correlation/reference ID. A local pass is repository evidence, not deployed evidence.

## Configuration

Configure secrets in the target platform, never in source control. At minimum verify:

- public Supabase URL and anonymous key;
- server-only Supabase service-role key;
- admin email allowlist and admin access code;
- approved provider credentials and callback secrets;
- Turnstile secret/site key where enabled;
- Stripe/email secrets only when those integrations are in pilot scope;
- `BUILD_VERSION` or deployment commit metadata;
- `DEPLOYMENT_TIMESTAMP`;
- `ENTERPRISE_MAINTENANCE_MODE=false` for an active pilot.

Record presence and rotation owner, not secret values.

## Database rollout

1. Back up the non-Production target and record the backup reference.
2. Review `202608060001_rc2_enterprise_operational_readiness.sql` and its dependency on the existing Trust Workspace and Trust Architecture migrations.
3. Apply the full ordered migration chain using the established release process.
4. Verify the new role constraint, `user_has_trust_workspace_role`, tenant policies, policy-governance table, append-only trigger and service-role RPC.
5. Run positive and negative tenant-isolation probes with two workspaces.
6. Verify direct authenticated writes to the governance event table are denied.
7. Exercise the service API and confirm one audit row answers Who, When, Why, Evidence, Authority and Replay.

The migration is forward-only. If qualification fails, stop traffic, preserve audit evidence and restore the isolated environment from its recorded backup or rebuild it from the prior release. Do not delete governance history to simulate rollback.

## Application checks

- `GET /api/health` returns liveness, schema version, trace/audit metadata and no secrets.
- `GET /api/ready` fails closed when required environment or schema state is absent.
- `/enterprise/operations` requires a verified admin session.
- `/api/admin/enterprise-operations` rejects unauthorized access and sets no-store, correlation and release headers.
- Policy governance GET/POST routes enforce tenant context, role, CSRF and evidence validation.
- CSP and security headers are present on HTML and API responses as configured.

## Operational qualification

Record each operations control as `HEALTHY`, `DEGRADED`, `BLOCKED`, `UNKNOWN` or `MAINTENANCE`. `UNKNOWN` is acceptable only with a named owner, reason, compensating control and deadline.

Durable background jobs, dead-letter queues and recovery jobs are not inferred from process-local state. Connect their telemetry before an enterprise SLA or unattended operation is claimed.

## Go/no-go

Go to a controlled pilot only when:

- repository and deployed validation pass;
- tenant denial tests pass;
- admin/session/CSRF tests pass;
- required providers have current health evidence;
- policy approval and rollback rehearsals pass;
- backup and recovery evidence is retained;
- every `UNKNOWN` has explicit acceptance.

Any missing authority, reviewer, evidence, replay, migration or rollback reference is a no-go.
