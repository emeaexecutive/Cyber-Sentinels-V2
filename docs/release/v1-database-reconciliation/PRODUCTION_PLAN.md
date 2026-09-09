# Production migration plan â€” prepared, not executed

Target: `kecgtsfibkypjuaxqbjx`. Production remains read only for this task.
Plan status: READY, subject to explicit authorization for a later execution.

The 108-entry Production ledger is DRIFTED against the 109-file canonical queue.
Every original ledger entry remains unchanged. Five remote-only definitions have
been recovered into `supabase/history/production`; their original statement arrays
are preserved in `ledger-definitions.json`. Never add the Staging archive to a
Production push context.

| Remote version | Provenance and live evidence | Future action |
| --- | --- | --- |
| 20260819084252 | Exact logical SQL match to local 20260819082001; both evidence trigger bodies supply observed_at and freshness_policy_seconds. Local alias already recorded. | Preserve both ledger entries and recovered SQL. |
| 20260819084329 | Ledger contains explicit trigger-function privilege hardening; both live functions deny PUBLIC/anon/authenticated and allow service_role. | Preserve this additional hardening and ledger entry. |
| 20260902083450 | SQL equals local 20260901120000; all four required api_keys service_role privileges exist. | Mark local 20260901120000 applied only after repeating these checks. |
| 20260903095127 | SQL equals local 20260903093116; validated webhook constraint includes all 13 event types. | Mark local 20260903093116 applied only after repeating these checks. |
| 20260904113046 | SQL equals local 20260904100313; alert_title is required, legacy title nullable, zero blank canonical titles. | Mark local 20260904100313 applied only after repeating these checks. |

World replay table/RPC and the outcome-review column/attachment RPC are absent.
Canonical persistence prerequisites, Replay, Memory, tenant RLS and service-only
RPC grants exist. Existing event types are all accepted by the forward outcome
migration. No existing review rows can conflict because the column is absent.

After PR approval and explicit Production migration authorization:

1. Verify backup/recovery readiness and recapture the ledger/schema; stop on any
   change that invalidates this plan.
2. Run `node tools/release/prepare-migration-context.mjs production`. This creates
   a local 114-file context (109 canonical + 5 recovered Production histories),
   without linking or contacting a database. Capture its absolute workdir.
3. Link that isolated context explicitly to `kecgtsfibkypjuaxqbjx`. Before each
   mutation verify its `supabase/.temp/project-ref` is exactly that value. Never
   rely on the root repository's existing link.
4. In that context, record only the three proven aliases using
   `supabase migration repair 20260901120000 20260903093116 20260904100313 --status applied --linked --workdir <context> --yes`.
   Do not delete, revert or rewrite any existing ledger entries.
5. Run `supabase db push --dry-run --include-all --linked --workdir <context>`.
   Require exactly this ordered set, with no other migration:

   - `202609060001_world_id_durable_replay_guard.sql`
   - `202609060002_world_id_replay_hardening.sql`
   - `20260907120000_add_decision_outcome_review_to_canonical_trust.sql`

6. Only if the set is exact, apply using the same context and `db push
   --include-all --linked --workdir <context> --yes`. The explicit include-all
   flag handles historical timestamp ordering; it is not permission to apply an
   unreviewed migration list.
7. Require 114 ledger entries, unchanged original 108 entries, no pending
   migrations, expected table/constraint/RPC/grant/RLS effects, and zero existing
   row violations. The outcome migration intentionally creates two NOT VALID
   checks; new writes are enforced, while existing rows must be checked separately.
8. Perform separately authorized post-migration qualification before any
   Production API GO decision. Do not infer real World provider qualification
   from database checks.

No command in steps 3â€“8 was executed against Production in this task.
No Production mutation, merge or deployment is authorized by this document.
