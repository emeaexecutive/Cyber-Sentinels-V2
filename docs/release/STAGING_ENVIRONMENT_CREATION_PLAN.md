# Epic 29 staging environment creation plan

Status: dedicated isolated staging target established; migration execution remains prohibited until Epic 29.2.

Inventory date: 2026-08-03.

Source baseline: `9f5fbcdaf3683e8c67b920e2b577cf82f89080d0` on `feature/enterprise-staging-release-foundation`.

## Sanitized environment inventory

No credentials, connection strings, database URLs, customer rows or private Auth data were inspected or recorded.

| Environment | Classification | Sanitized evidence | Suitability for Epic 29 |
| --- | --- | --- | --- |
| Linked Supabase project, ref `kecgtsfibkypjuaxqbjx` | Production | active/healthy project in `eu-west-3`, PostgreSQL 17; only visible branch is default `main`, whose branch status reports `MIGRATIONS_FAILED` | prohibited; do not resync, reset, repair or use as staging |
| Supabase project `TracFace`, ref `qkubvouilwggilabwpzp` | Unknown/out of scope | inactive, unrelated name, PostgreSQL 17 in `eu-west-3` | prohibited absent separate ownership and purpose approval |
| PR #16 Supabase Preview, former ref `ercrvavvdnpwbidzscbb` | Disposable Preview | clean reconstruction passed before PR #16 merged; branch is no longer present in the active branch inventory | unavailable and not a retained staging target |
| Supabase project Cyber Sentinels Staging, ref agpyhygpfmppjkxwcpac | Dedicated staging | active/healthy isolated project in eu-west-3, PostgreSQL 17, Free plan, no paid add-ons | approved target; synthetic data only and retained through Epic 31 |
| Local database runtime | Local development | Supabase CLI is available through `npx`; neither `psql` nor Docker/PostgreSQL runtime is available on PATH or running | cannot currently execute reconstruction |
| GitHub `Preview` environment | Disposable Preview integration | environment exists and PR #16 had successful Vercel and Supabase Preview checks | integration exists, but no retained database or approved staging identity exists |
| GitHub/Vercel `Production` environment | Production | current `main` deployment metadata exists | prohibited; no environment-variable or deployment mutation authorized |
| Canonical Cloudflare-fronted domain | Production | repository declares `www.cybersentinels.com`; live Cloudflare controls were not queried | prohibited; no DNS, WAF, Turnstile or domain change authorized |
| Test-only domains | Local/test | `example.invalid` is reserved for future synthetic staging identities; no hosted test domain is configured | safe only after an isolated target and access policy are approved |

The repository contains environment-variable templates and the approved non-secret staging identity registry. No staging secret binding is configured in this slice. Secret values were not recorded. The local `.env.local` file is not evidence of a staging database.

## Approved decision

Decision completed on 2026-08-03: the owner approved a dedicated Supabase staging project. The project is separate from Production, has its own database, Auth boundary, API credentials and migration ledger, and is not connected to a Production hostname or promotion path.

The approved selection is option 2. The alternatives are retained as the decision record:

1. **Persistent Supabase staging branch** under the current organization.
2. **Dedicated Supabase staging project** with an independent migration ledger.
3. **New disposable Preview explicitly retained for the Epic 29 evidence window.**
4. **Local PostgreSQL/Supabase reconstruction plus a hosted isolated branch** for live API and UI validation.

Option 1 is the smallest operational change if Supabase branch retention, billing and Auth isolation are acceptable. Option 2 provides the clearest lifecycle and blast-radius separation. Option 3 is suitable only if retention and reproducibility are guaranteed for the entire evidence window. Option 4 additionally requires an approved local database runtime.

## Approval requirements

Record all fields below before any hosted mutation:

| Field | Required value |
| --- | --- |
| Environment name | explicit non-Production name containing `staging` |
| Environment type | persistent branch, dedicated project, retained Preview, or local plus hosted |
| Parent/organization | confirmed owner and organization |
| Region | selected region and rationale |
| PostgreSQL major version | target major version |
| Supabase project/branch reference | assigned after creation; never a connection string |
| Creation timestamp | UTC |
| Responsible owner | named accountable owner |
| Retention policy | duration and evidence-retention need |
| Deletion policy | trigger, approver and verification procedure |
| Cost | no cost, included allowance, or explicitly approved amount |
| Auth policy | staging-only redirect allowlist and synthetic identities |
| Data policy | synthetic fixtures only; no Production row copy |
| Promotion policy | no automatic promotion to Production |

## Established staging identity

| Field | Recorded value |
| --- | --- |
| Environment name | Cyber Sentinels Staging |
| Environment type | dedicated non-Production Supabase project |
| Organization | xcdwmsuysmmhbcpxtvql (Cyber Sentinels TracFace) |
| Region | eu-west-3, matching Production geography without sharing its database |
| PostgreSQL major version | 17 (created at version 17.6.1.155) |
| Project reference | agpyhygpfmppjkxwcpac |
| Creation timestamp | 2026-08-03T05:38:10.24516Z |
| Responsible owner | Cyber Sentinels repository and Supabase organization owner |
| Retention policy | retain through Epic 31; deletion requires explicit owner approval |
| Plan and expected recurring cost | Free/Nano, $0; second active Free project, no paid add-ons selected |
| Backup availability | no managed daily-backup entitlement on Free; manual off-site backup required before material staging data |
| PITR availability | not enabled and not available without a paid plan/add-on |
| Pausing policy | eligible for automatic pause after low activity under the Free plan |
| Auth policy | staging-only Auth configuration and synthetic identities; no Production redirect or user copy |
| Data policy | synthetic fixtures only; no Production row or customer-data copy |
| Promotion policy | no automatic promotion to Production |

No database password, database URL, API key, service-role key, access token or JWT secret is recorded here. The one-time creation credential was immediately replaced through the supported Supabase password endpoint, and neither value was retained. Project credentials remain separate from Production and must be handled only through approved secret storage or reset flows.

## Mandatory safeguards

- Verify the target ref is not `kecgtsfibkypjuaxqbjx` before every live command.
- Require an explicit `STAGING` environment identity in runners; refuse blank, unknown or Production identities.
- Use a separate database and migration ledger with no Production row data.
- Use only `example.invalid` synthetic identities and bounded synthetic fixtures.
- Keep Auth redirects, secrets and service-role credentials isolated from Production.
- Connect only a protected Vercel Preview/staging deployment; never assign Production domains.
- Enforce `noindex`, `nofollow` and `noarchive`, plus Preview protection or approved access control.
- Disable automatic promotion and document retention/deletion behavior.
- Log project/branch identifiers, release IDs, migration timestamps and results, but never URLs or credentials.
- Require owner approval before creation if the target can incur cost.

## Creation and verification sequence

1. Completed: record the approved, non-secret staging identity in this document.
2. Completed: create only the approved non-Production target.
3. Completed: verify its project reference, region, PostgreSQL version, creation time, plan and health.
4. Completed: add a deny-by-default Production reference and hostname guard.
5. Epic 29.2: configure staging-only Auth and Vercel Preview bindings without changing Production variables.
6. Epic 29.2: prove the target starts with no Production data and owns an independent migration ledger.
7. Epic 29.2: run the empty-database reconstruction and retain execution evidence.
8. Epic 29.2: recreate the sanitized Production-head boundary with empty/synthetic content and apply only the pending chain.
9. Epic 29.2: run live RLS, governance, cross-Epic, API, UI, recovery and performance evidence against this target.
10. Epic 31 or later: delete or retain the environment only under the approved policy.

## Stop conditions

Stop immediately if the target cannot be conclusively distinguished from Production, if a command resolves to the Production ref, if billing/retention is unapproved, if credentials would be exposed, if Production data appears, or if RLS/migration execution fails.

## Current decision

The dedicated isolated staging project is established and registered in config/environments/registry.json. The reusable guard in tools/release/environment-safety.ts denies Production and unknown identities and requires synthetic mode for staging validation.

No migration was applied, no project was linked, no database reset command was run, no Vercel or Cloudflare setting was changed, and Production was untouched.

**NEXT ACTION: EPIC 29.2 MAY PREPARE THE ISOLATED STAGING MIGRATION AND RLS VALIDATION PLAN.**
