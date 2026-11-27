# Disaster Recovery

**Latest Storage closure (10 October): ALL SIX RECOVERY CATEGORIES PASS for the accepted isolated profile with mandatory local hardening. Actual Production payload export and isolated restoration passed; Production was not mutated and targets are stopped. See [final Storage evidence and procedure](storage-recovery-closure-20261010.md). Storage BLOCKED statements below describe the earlier phase and are superseded; historical limitations and security qualifications remain.

**Status:** Database and integrated isolated application recovery have passed with the required local security hardening step. Full platform recovery remains BLOCKED by missing original Storage payloads. See the [10 October recovery closure](recovery-closure-20261010.md) for the final evidence, conditions and automation; Production was not changed.

## Recovery priorities

1. Domain and trusted communication.
2. Authentication safety.
3. Data integrity.
4. Tenant isolation.
5. Core verification.
6. Trust decisions and enforcement.
7. Reports and evidence exports.
8. Analytics and non-critical functions.

## Scenarios

| Scenario | Immediate containment | Recovery direction |
| --- | --- | --- |
| Git/repository loss | Freeze releases; verify trusted mirrors | Restore protected repository, refs and tags; verify signatures/hashes |
| Vercel failure | Maintain status communication; stop repeated deploys | Use approved platform recovery or alternate documented host only after validation |
| Cloudflare/domain compromise | Use verified registrar contacts; lock changes | Restore DNS/TLS from approved inventory and validate canonical chain |
| Supabase outage | Fail protected/data operations safely | Monitor provider recovery; reconcile queued/idempotent work |
| Database corruption/deletion | Declare SEV1; stop writes | Restore approved backup/PITR, validate schema/RLS/integrity and accepted data window |
| Provider outage | Disable/degrade provider; no invented evidence | Fail closed, use approved alternate only if fully integrated, reconcile callbacks |
| Credential compromise | Revoke/rotate and restrict affected paths | Replace scoped secrets, invalidate sessions/keys and audit use |
| Environment-variable loss | Block affected runtime | Restore names/scopes from controlled inventory; redeploy and smoke test |
| Regional disruption | Declare scope and dependencies | Use vendor recovery or approved regional design; validate data consistency |

## RTO and RPO

Targets are not declared until owners, dependency capabilities and exercises support them. Each recovery test records measured recovery time and data-loss window. Aspirational values must be labelled proposed.

## Recovery verification

Verify trusted SHA/configuration, authentication, tenant denial, migration state, evidence/audit integrity, critical workflow, Replay/graph/memory consistency, reports and alerts before resuming normal service.

## External prerequisites

Registrar/domain recovery, Cloudflare/Vercel/Supabase account recovery, backup/PITR configuration, secret escrow and provider escalation contacts require dashboard/operator evidence outside the repository.
