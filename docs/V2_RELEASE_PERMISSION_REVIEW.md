# PR #109 permission repair: release review

Review date: 2026-09-28. Source baseline: `0d739f6ae4e3226dae862de4975d3cf519abded0`, with the final auth/i18n changes still being prepared on the same branch. This review performed local tests and read-only hosted catalog checks. It did not merge, deploy, apply hosted SQL, or rewrite migration history. It is a pre-release record, not evidence that Production is repaired.

## Conclusion and exact change

The existing forward migration is appropriate for the four proven exposed internal writers. It changes only their execution privileges, preserves their definitions and owners, and retains `service_role` execution. Include it in the authorized normal post-merge release, using the original version and an isolated Production migration context. Do not create a replacement migration with a new timestamp through an ad hoc SQL/MCP apply operation.

File: `supabase/migrations/20260926113958_restrict_internal_governance_helper_execution.sql`.

Reviewed raw-file SHA-256: `097453C4286DA7339E219553E72DDE089688E076DA13EC1D380347A6AF3FBFFE`.

Its entire executable SQL is:

```sql
revoke execute on function public.ensure_governance_policy(text,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.create_governance_action_if_needed(uuid,text,uuid,text,text) from public, anon, authenticated;
revoke execute on function public.notification_insert(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.trust_timeline_record_event(jsonb,text,text,text,text,text) from public, anon, authenticated;

grant execute on function public.ensure_governance_policy(text,text,text,text,text) to service_role;
grant execute on function public.create_governance_action_if_needed(uuid,text,uuid,text,text) to service_role;
grant execute on function public.notification_insert(uuid,text,text,text,text,jsonb) to service_role;
grant execute on function public.trust_timeline_record_event(jsonb,text,text,text,text,text) to service_role;
```

There are no table/data changes, function replacements, schema resets, historical edits, RLS changes, or broad role grants. Revoking the `PUBLIC` grant matters because a role can inherit execution through `PUBLIC` even when it has no individual grant. [PostgreSQL 17 privilege reference](https://www.postgresql.org/docs/17/sql-grant.html).

## Fresh Production evidence

Read-only catalog queries against project `kecgtsfibkypjuaxqbjx` found all four exact signatures. Each is `SECURITY DEFINER`, owned by `postgres`, and currently executable by `PUBLIC`, `anon`, `authenticated`, and `service_role`. Thus the exposure was still present at review time.

| Function | `md5(prosrc)` before release |
| --- | --- |
| `ensure_governance_policy` | `ba52d271894559fc4145b7698cdd9a6a` |
| `create_governance_action_if_needed` | `4863f7f81c091241c50194352fe206d5` |
| `notification_insert` | `86791c48fd24f095ac1811c3bd0e1bae` |
| `trust_timeline_record_event` | `9e966a850d4830ca4c65efebc1977617` |

The migration ledger had 116 entries, latest version `20260913132642`; version `20260926113958` was absent. These counts are a dated baseline. Re-read them immediately before application and reconcile any concurrent changes rather than assuming the numbers remain fixed.

Source and live `pg_proc.prosrc` inspection found 18 callers; every caller is a `postgres`-owned `SECURITY DEFINER` trigger function:

- Governance: `governance_from_agent_activity`, `governance_from_ai_audit`, `governance_from_case_missing_evidence`, `governance_from_signal`, `governance_from_trust_algorithm_run`.
- Notifications: `notify_ai_recommendation_audit`, `notify_governance_action_insert`, `notify_governance_action_update`, `notify_suspicious_agent_activity`, `notify_trust_case_update`.
- Timeline: `trust_timeline_record_agent_activity`, `trust_timeline_record_algorithm_run`, `trust_timeline_record_audit`, `trust_timeline_record_decision`, `trust_timeline_record_evidence`, `trust_timeline_record_relationship`, `trust_timeline_record_signal`, `trust_timeline_record_trust_event`.

Those callers execute with the trusted owner's privileges. This migration does not remove the owner's execution rights. No direct application call to these four helper names was found in `app`, `lib`, or `src`. Original function bodies and trigger callers are in `202606080005_operational_governance_engine.sql`, `202606080007_operational_notifications_coordination.sql`, and `202606080002_trust_timeline_events.sql`.

## Local verification and limits

Executed successfully: 12 tests, 12 passed, zero failed or skipped.

```powershell
node --test --test-reporter=spec tests/internal-governance-helper-permissions.test.mjs tests/migration-namespace-reconciliation.test.mjs tests/migration-context-fix.test.mjs tests/hosted-migration-context.test.mjs
```

The PGlite regression loads the original four function bodies, confirms the initial exposure, applies the actual migration, then proves denied `anon`/`authenticated` execution and retained `service_role` permission for all four signatures. Direct client calls fail with SQLSTATE `42501`. An authenticated insert through an owner-owned definer fixture trigger still creates a governance action; a service-role governance helper call succeeds.

The test does not exercise every real notification/timeline trigger chain or rebuild the complete Production schema. Preservation evidence is the unchanged function bodies, the live caller/owner inspection, and the bounded behavioral test. Post-release tenant and runtime smoke tests remain necessary; this review does not replace them.

The migration-context tests check canonical byte preservation, the five known historical marker identities, separate environment archives, duplicate rejection, and exclusion of temporary links and environment files. A fresh local-only Production context was also created: 117 migration files, unlinked, no database change, and an identical permission-migration hash. That pre-merge context must not be reused for release; generate a fresh context from the verified merged commit.

## Approved path and constraints

`docs/production-release.md` and `tools/release/release-manager.ts` define the Node 22 validation workflow. `npm run release:full` runs locked installation, security/consent checks, lint, typecheck, the full suite, and build. `--dry-run` is only a static report and is not release qualification. The manager does not merge or deploy.

The manager's optional `--migrate` runs `supabase db push --include-all` from the repository link and then database lint. It does not take an isolated `--workdir` or prove the exact pending set. For this repository's recovered historical migrations, use the isolated context established in `docs/release/v1-database-reconciliation/PRODUCTION_PLAN.md`, with the normal validation manager run separately without `--migrate`.

The old reconciliation plan's three `migration repair` commands and its 108/114 counts are historical. Do not repeat those repairs. `prepare-migration-context.mjs production` replaces the five inert canonical history markers with their preserved Production originals and includes only the Production archive. It never includes the Staging archive. A new dry run must show exactly `20260926113958_restrict_internal_governance_helper_execution.sql`; any additional pending migration is a stop condition.

Node was `22.23.1`, npm `10.9.8`, and the installed Supabase CLI was `2.116.0`. Actual CLI help confirms `--workdir`, `--linked`, `--dry-run`, `--include-all`, and `--skip-vault`. Keep the locked CLI for the release. `--skip-vault` prevents unrelated Vault synchronization; do not add `--include-seed` or `--include-roles`. The [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push) documents migration-ledger-based pushes and the dry-run mechanism.

Before mutation, record the approved merge SHA, exact target, migration hash, current ledger/function evidence, and backup/recovery readiness. The repository requires recovery readiness in `docs/database/migration-operations.md`; the historical backup report is not current recovery proof. Stop for a changed target/signature/body, unexpected pending migration, failed mandatory checks, or unavailable authenticated database access. Do not relax `config/environments/registry.json` to bypass the release controls.

## Post-merge PowerShell sequence

These commands are a release plan. They were not executed against Production during this review. They depend on the user's authorized merge/release, green final checks, and the preflights above. Run in the existing repository and substitute the actual merged commit from PR #109.

```powershell
$releaseRepo = 'C:\Users\emeae\Desktop\cyber-sentinels-v2-release'
$releaseProject = 'kecgtsfibkypjuaxqbjx'
$releaseExpectedSha = '<verified PR #109 merge SHA>'
$releaseMigration = '20260926113958_restrict_internal_governance_helper_execution.sql'
Set-Location -LiteralPath $releaseRepo
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git checkout main
if ($LASTEXITCODE -ne 0) { throw 'Checkout failed' }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Fast-forward failed' }
if ((git rev-parse HEAD).Trim() -ne $releaseExpectedSha) { throw 'Unexpected main SHA' }
if ((git rev-parse origin/main).Trim() -ne $releaseExpectedSha) { throw 'Unexpected remote SHA' }
if (git status --porcelain) { throw 'Release tree is not clean' }

npm run release:full
if ($LASTEXITCODE -ne 0) { throw 'Release qualification failed' }

$releaseContext = node tools/release/prepare-migration-context.mjs production | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $releaseContext.targetProject -ne $releaseProject) { throw 'Invalid migration context' }
$releaseWorkdir = $releaseContext.workdir
$releaseSourceHash = (Get-FileHash -LiteralPath (Join-Path $releaseRepo "supabase\migrations\$releaseMigration") -Algorithm SHA256).Hash
$releaseContextHash = (Get-FileHash -LiteralPath (Join-Path $releaseWorkdir "supabase\migrations\$releaseMigration") -Algorithm SHA256).Hash
if ($releaseSourceHash -ne $releaseContextHash) { throw 'Migration copy mismatch' }

npx --no-install supabase link --project-ref $releaseProject --workdir $releaseWorkdir
if ($LASTEXITCODE -ne 0) { throw 'Production context link failed' }
$releaseRefPath = Join-Path $releaseWorkdir 'supabase\.temp\project-ref'
if ((Get-Content -LiteralPath $releaseRefPath -Raw).Trim() -ne $releaseProject) { throw 'Wrong database target' }
npx --no-install supabase migration list --linked --workdir $releaseWorkdir
if ($LASTEXITCODE -ne 0) { throw 'Ledger inspection failed' }
npx --no-install supabase db push --dry-run --include-all --skip-vault --linked --workdir $releaseWorkdir
if ($LASTEXITCODE -ne 0) { throw 'Migration preflight failed' }
```

Inspect and retain the dry-run output. Proceed only when it names exactly the reviewed migration, current source/hash and ledger match the approved plan, recovery readiness is established, and the context is still the same. The explicit `--include-all` handles history ordering; it does not authorize an unexpected pending set.

```powershell
if ((git rev-parse HEAD).Trim() -ne $releaseExpectedSha) { throw 'Release SHA changed' }
if (git status --porcelain) { throw 'Release tree changed' }
if ((Get-Content -LiteralPath $releaseRefPath -Raw).Trim() -ne $releaseProject) { throw 'Wrong database target' }
if ((Get-FileHash -LiteralPath (Join-Path $releaseWorkdir "supabase\migrations\$releaseMigration") -Algorithm SHA256).Hash -ne $releaseContextHash) { throw 'Migration changed' }
npx --no-install supabase db push --include-all --skip-vault --linked --workdir $releaseWorkdir --yes
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop and inspect' }
npx --no-install supabase db lint --linked --workdir $releaseWorkdir --level error --fail-on error
if ($LASTEXITCODE -ne 0) { throw 'Database lint failed' }
npx --no-install supabase migration list --linked --workdir $releaseWorkdir
if ($LASTEXITCODE -ne 0) { throw 'Post-migration ledger inspection failed' }
npx --no-install supabase db push --dry-run --include-all --skip-vault --linked --workdir $releaseWorkdir
if ($LASTEXITCODE -ne 0) { throw 'Post-migration dry run failed' }
```

Require the original migration version in the ledger, no pending migration, unchanged original history, and unchanged owners, bodies, signatures and definer status. If the 116-entry baseline is still current, the new total is 117. Effective `PUBLIC`, `anon`, and `authenticated` execution must now be false for all four functions, and `service_role` execution true. Use catalog inspection to prove denial without invoking formerly exposed writers against real data. Also verify the existing canonical/tenant permission checks and absence of new runtime/trigger errors.

This read-only query provides an exact before/after comparison:

```sql
with target(signature) as (values
 ('public.ensure_governance_policy(text,text,text,text,text)'),
 ('public.create_governance_action_if_needed(uuid,text,uuid,text,text)'),
 ('public.notification_insert(uuid,text,text,text,text,jsonb)'),
 ('public.trust_timeline_record_event(jsonb,text,text,text,text,text)'))
select t.signature, p.oid is not null as exists,
 p.prosecdef as security_definer, pg_get_userbyid(p.proowner) as owner,
 md5(p.prosrc) as body_md5,
 has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
 has_function_privilege('service_role',p.oid,'execute') as service_execute,
 exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
from target t left join pg_proc p on p.oid=to_regprocedure(t.signature)
order by t.signature;
```

## Authentication and existing Vercel project

Only environment-variable presence was inspected; no credential values were printed. These names were absent from both process and user environment scopes: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. This does not establish that cached CLI credentials or managed application secrets are absent.

The Supabase CLI successfully listed projects through its existing authentication. Production was active/healthy in `eu-west-3`, PostgreSQL 17, and the root `.temp/project-ref` matched `kecgtsfibkypjuaxqbjx`. This proves Management API read access, not that a database push can authenticate; verify that using the isolated linked dry run. Do not solicit or print an account password when the existing authorized tooling already works.

The existing `.vercel/repo.json` links directory `.` to project `cyber-sentinels-v2`, ID `prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr`, organization `team_cA31fBlNke4vlmtQKM44oWlw`. There is no `.vercel/project.json`; this is a repository link. `vercel.json` specifies Next.js and disables Git deployment on `main`, so a merge alone will not release the application.

The parent release investigation separately verified the existing Production/root/www deployment through the Vercel connector: `dpl_8r32WrUgRsRwPUJrXzSV2pErqLPL`, `READY`, source SHA `e9a90f973aacbe6967f14a527540208431a2ec13` from PR #105. It therefore predates PR #107's sign-out changes. This is a source-version explanation, not proof of the final auth flow after release.

Use the existing project and Production environment; do not create another project or replace managed environment values. Cached Vercel CLI 59.23.2 help confirms an explicit existing-project command of the following form after final main/database verification:

```powershell
npx --no-install vercel@59.23.2 deploy --prod --yes --project prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr --scope team_cA31fBlNke4vlmtQKM44oWlw
```

This command is a deployment instruction, not a deployment result. Cached CLI `whoami` completed successfully as `emeaexecutive-9603` using both 59.23.2 and 59.11.2; 59.23.2 printed an update-worker warning before returning successfully. This establishes cached account authentication without exposing a token, not deployment authorization for any different project. Confirm the resulting deployment is `READY`, source SHA equals the verified merged main SHA, target is Production, and both root/www aliases resolve to it. Then run the requested login/logout/recovery/backoffice/API checks. A local unit test, successful build, or deployment status alone cannot establish the real email recovery UX.
