# RC2 Enterprise Operational Readiness

## Release decision

RC2 strengthens the existing Enterprise Trust Platform for a controlled design-partner pilot. It does not introduce a second trust engine, evidence ledger, policy store, replay system or tenant model.

The protected `/enterprise/operations` workspace and `/api/admin/enterprise-operations` endpoint consolidate operational evidence from existing owners. Missing durable telemetry is reported as `UNKNOWN`; it is never translated into zero, healthy or ready.

**Production untouched.** No Production deployment, migration, environment mutation, provider call or external control-plane change was performed as part of RC2.

## Operational readiness

| Area | Canonical owner | RC2 result | Deployment evidence still required |
| --- | --- | --- | --- |
| Enterprise settings | Enterprise Operations index | Ten existing enterprise controls have one protected index | Named tenant operator sign-off |
| Multi-tenant administration | Trust Workspace | RC2 migration replaces original permissive workspace RLS with tenant and role checks | Apply migration outside Production first; run denial tests |
| Roles and teams | Workspace Access | Owner, admin, operator, reviewer, auditor, observer and integration-admin roles are constrained | Tenant invitation and revocation exercise |
| Policies | Trust Architecture | Append-only approval, reviewer, evidence, authority, replay and rollback events | Apply migration; execute approval and rollback rehearsal |
| Environments | Deployment Readiness | Release, environment and explicit maintenance mode are surfaced | Target-environment configuration evidence |
| Audit | Auditability and Trust Architecture audit log | Material action contract answers Who, When, Why, Evidence, Authority and Replay | Query retained event in pilot database |
| Providers | Provider Registry | Configuration, health and runtime observation remain distinct | Live/sandbox provider health evidence |
| Queues and jobs | Platform Health | Governance, replay and retry state are visible; absent job, DLQ and recovery telemetry remains `UNKNOWN` | Connect durable worker telemetry |
| Lifecycles | Existing domain owners | Fifteen lifecycle responsibilities link to their canonical surfaces | Complete one retained end-to-end pilot transaction |

## Governance contract

The application contract allows only these policy transitions:

`DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUPERSEDED | ROLLED_BACK`

`PENDING_APPROVAL → REJECTED → DRAFT` is the revision path.

Approval, activation, rejection and rollback require reviewer attribution. Every transition requires a reason, approval evidence, authority reference, replay reference and correlation ID. Rollback also requires a prior version of the same tenant policy. The migration uses compare-and-set semantics and append-only records.

## Security review

| Control | Repository evidence | RC2 boundary |
| --- | --- | --- |
| Authentication | Supabase `getUser()` protects user/admin flows | Identity-provider uptime is target-environment evidence |
| Authorization | Admin allowlist, tenant membership and role checks | RC2 migration must be applied and denial-tested before reliance |
| Session handling | Time-bounded secure admin cookie | Production cookie behavior requires deployed verification |
| CSRF | Origin, fetch-site, content-type and payload-size guards on canonical mutations | Each new mutation must use the same guard |
| CSP and headers | CSP, HSTS, frame denial, referrer, permissions and anti-sniffing headers | CSP contains compatibility allowances that should be reduced after nonce rollout |
| Turnstile | Dedicated verification endpoint | Turnstile is abuse control, not authorization |
| Secrets | Server-only environment readers and redacted health payloads | Rotation evidence belongs to the deployment owner |
| Rate limiting | Route-level controls plus external-control truth | Durable edge enforcement remains externally verified |
| Security events | Admin access and governance writes are audited | Alert delivery must be exercised in the pilot environment |

## Observability

RC2 exposes correlation ID, release version, environment, observed timestamp, platform health, queue depth, provider state, retries, dead letters, recovery jobs and maintenance mode. The public `/api/health` route is a minimal no-store liveness probe with release metadata. Sensitive operational state remains behind admin authorization.

Process-local diagnostics are not fleet observability, capacity evidence or an SLA. Background-job, dead-letter and recovery state remains `UNKNOWN` until a durable worker system supplies telemetry.

## Architecture review

### Ownership

- Trust decisions remain owned by the canonical Trust Fabric and Trust Decision Intelligence modules.
- Policy versions remain owned by `trust_policy_versions`; RC2 adds append-only governance evidence around them.
- Tenant scope remains `trust_workspaces` plus membership and RLS.
- Audit remains in the Trust Architecture audit log and canonical event systems.
- The RC2 operations model is a projection only. It has no write-side configuration state.

### Data flow

1. An authenticated admin request resolves an enterprise context.
2. Existing health and provider owners produce a bounded snapshot.
3. RC2 projects those values with release and correlation metadata.
4. Missing durable telemetry stays `UNKNOWN`.
5. Policy governance writes use a service-role RPC, tenant-bound foreign keys, transition validation and an append-only audit event.

### Failure behavior

- Missing authentication redirects or rejects before protected data is returned.
- Missing tenant policy versions fail closed.
- Invalid governance transitions, absent evidence, absent reviewer attribution and invalid rollback targets fail closed.
- Health checks do not expose secrets or raw webhook payloads.
- Maintenance must be explicitly configured; absence is `UNKNOWN`.

### Architecture verdict

The RC2 changes are additive and align with existing ownership boundaries. They are suitable for repository review and a non-Production deployment rehearsal. Enterprise readiness remains conditional on migration application, durable worker telemetry, live denial-path checks, provider evidence and a completed design-partner transaction.

## Exit criteria

- `npm ci`, lint, typecheck, test and build pass from the RC2 commit.
- The RC2 migration is applied to a disposable or staging database and denial paths pass.
- One policy follows the full approval lifecycle with retained evidence and rollback reference.
- One design-partner transaction produces verification, decision, replay, Trust Memory and executive-report references.
- Named owners accept open `UNKNOWN` operational controls or connect their telemetry.
