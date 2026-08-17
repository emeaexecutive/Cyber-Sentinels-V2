# Product Closure Preview qualification

Verified 2026-08-14 against canonical staging `agpyhygpfmppjkxwcpac` and draft PR #57.

## Proven

- Repository-owned workspace bootstrap and security-reconciliation migrations applied to staging only.
- Workspace bootstrap creates one workspace and one owner membership atomically.
- Duplicate workspace-owner groups and duplicate membership groups are both zero.
- RLS is enabled on workspaces, memberships, Operational Entities, canonical transactions, evidence graph, Replay, Trust Memory, trust signals, trust alerts, and the trust timeline.
- Customer A and Customer B each enumerate only their own workspace, membership, Operational Entity, and evidence node.
- Reciprocal cross-tenant reads return zero rows; cross-tenant membership/entity inserts and workspace deletes are denied; cross-tenant updates affect zero rows.
- `Agent Alpha` qualification data remains `UNVERIFIED` with no authority or trust evidence fabricated.
- Five timeline helper functions now have an empty fixed `search_path`.
- Internal `SECURITY DEFINER` functions are no longer callable by `anon` or `authenticated` through the Data API.
- Workspace and membership table grants are reduced to the authenticated operations used by the product.
- Dependency audit reports zero known vulnerabilities after the `nanoid` override.

## Advisor classification

| Finding | Classification | Reason |
| --- | --- | --- |
| Mutable timeline helper `search_path` (5) | FIXED | All five functions use an empty fixed path with schema-qualified references. |
| Anonymous/authenticated execution of internal security definers | FIXED | Direct Data API execution was revoked; service and trigger execution remain available where designed. |
| Duplicate workspace/member permissive policies | FIXED | Legacy and fail-closed copies were removed; one canonical policy remains per operation. |
| Workspace `auth.uid()` init-plan | FIXED | The insert policy uses `(select auth.uid())`. |
| Excessive workspace/member grants | FIXED | Authenticated access is limited to `SELECT`, `INSERT`, and `UPDATE`; anonymous access is revoked. |
| Three authenticated workspace helper definers | ACCEPTED_WITH_REASON | Non-recursive RLS requires these strict, stable helpers. Anonymous execution is revoked and `search_path` is fixed. |
| Legacy-table RLS init-plan warnings | ACCEPTED_WITH_REASON | Performance-only findings outside the workspace bootstrap; canonical tenant reads were proven fail-closed. |
| Legacy multiple-permissive-policy warnings | ACCEPTED_WITH_REASON | Inspected policies remain role/owner/tenant scoped; consolidation is a separate performance cleanup. |
| Leaked-password protection and additional MFA warnings | ACCEPTED_WITH_REASON | Staging auth configuration warning; controlled accounts use unique random credentials. Production release remains separately gated. |

## Exact blockers

- `SUPABASE_SERVICE_ROLE_KEY` for canonical staging is unavailable from the connected secret stores. The Preview deliberately uses a fail-closed branch override, so server-side Operational Entity and trust-decision writes cannot be qualified.
- Supabase's Git integration is attached to Production and its PR branch cannot be reparented. Canonical staging is on a Free plan and rejected creation of a replacement Supabase branch, so the automated `Supabase Preview` check is cancelled/red even though direct staging migration and RLS proofs pass.
- No custom staging SMTP configuration was available to verify; mailbox recovery is classified `SMTP_NOT_CONFIGURED` and stopped without blocking unrelated database proof.
- Because the exact browser journey cannot complete server-side trust writes, ALLOW/REVIEW/DENY persistence, receipt, Replay, Trust Memory, Alpha/Beta delegation/revocation, and desktop/mobile golden-journey qualification remain unproven.

Production Supabase `kecgtsfibkypjuaxqbjx` was not migrated, written, or reconfigured.
