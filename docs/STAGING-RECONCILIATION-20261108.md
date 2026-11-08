# Staging reconciliation and qualification plan — 8 November 2026

No hosted migrations, synthetic writes or Production changes have been performed. Existing Staging is agpyhygpfmppjkxwcpac; Production is kecgtsfibkypjuaxqbjx. Use separate approvals for migration application, Preview binding updates and synthetic fixtures.

## Corrected migration interpretation

The five baseline files absent from Staging history (20260819084252, 20260819084329, 20260902083450, 20260903095127, 20260904113046) are COMMENT-ONLY Production ledger identity markers. They explicitly point to supabase/history/production and say not to replay. Do not mark them as five unapplied executable migrations or push them to repair Staging.

All 37 additional Staging versions have known source locations: 21 under supabase/history/staging in the website baseline, and 16 executable October security/schema changes in the preserved TENENTE checkout. Seven additional versions reuse an earlier migration name; name equality alone does not establish semantic equivalence. Twenty recorded statement hashes match source text exactly or after line-ending/edge-whitespace normalization. Seventeen still require statement-by-statement reconciliation. See drift-classification.json for exact version, source and match lists. No ledger repair is proposed from a hash/name comparison alone.

Read-only effect checks for the five historical areas found: service-role api_keys CRUD privileges present in both environments; materialization trigger routines deny anon/authenticated EXECUTE and allow service_role in both; webhook event constraints match. Consent/provider evidence routine definition hashes differ. trust_alerts also differs: Staging is stricter for created_at, metadata, risk_level, status and updated_at; subject_type differs too. This is demonstrable schema drift, not version-list equivalence. No data values were read to infer backfill success.

## Exact sequence before any hosted migration

1. Preserve both live migration ledgers and schema definitions; retain the restored Staging recovery evidence and verify current backup availability/retention/recovery access.
2. Review the 21 archived Staging entries alongside their canonical replacements. Do not reapply archived SQL. Verify the two identical registry hashes at 20260817175448/20260817175455 as a recorded duplicate, not two needed repairs.
3. Reconcile the 16 October source migrations from the separate TENENTE work against Staging, including approval default deny, active customer sessions, private evidence downloads and the existing payload_digest execution reservation extension. Preserve these protections; do not overwrite Staging with the older website schema.
4. For the seventeen source/hash mismatches, compare recorded statement arrays with the named source file, accounting for statement splitting and comments, then diff actual affected objects. A mismatch is unresolved until that review establishes formatting-only change or an explicit forward repair.
5. Rehearse the new atomic-dispatch SQL against a disposable database restored from the reviewed Staging schema. Current 23-test evidence uses a minimal predecessor contract fixture and does not replace that rehearsal. Verify grants/RLS/function search_path, existing append-only triggers and all extra security policies.
6. Obtain approval for ONLY the named atomic-dispatch migration (and any separately reviewed compatibility repair), then apply to Staging only. No Production migration is authorised. Existing approvals have no new scope snapshot and intentionally cannot dispatch; obtain a new exact-action approval in authorised fixtures.
7. Bind the reviewed Preview branch to this Staging, verify Auth/Turnstile/isolation, then obtain synthetic-write approval and run Auth, consent, tenant isolation and execution concurrency fixtures with cleanup and database/provider evidence. No rollout may rely on local tests alone.

## Preview binding preparation

The Vercel metadata inventory is truncated; it shows global Preview variables, including SUPABASE_URL, API-key secrets and STRIPE_SECRET_KEY, plus overrides on other branches. Zero overrides on a new branch does NOT prove an empty/effectively isolated environment. Values were not decrypted or exposed. Inherited database/provider bindings must be overridden or proven non-production before a hosted write test.

Prepared target: existing project cyber-sentinels-v2, Preview only, branch website/spanish-public-completion-20261108; security qualification can use the migration branch only after review. Intended database origin: https://agpyhygpfmppjkxwcpac.supabase.co. Required bindings: NEXT_PUBLIC_SUPABASE_URL; server SUPABASE_URL; Staging public key aliases actually consumed by lib/env.ts; SUPABASE_SERVICE_ROLE_KEY; independent CONSENT_COOKIE_SECRET and NATIVE_DESTINATION_EVIDENCE_KEY; approved Staging CONSENT_DEFAULT_ENTERPRISE_ID; precise Preview public origin; live Turnstile site/secret pair and expected hostname. Public key aliases may intentionally share the same Staging public key; secret credentials must not be copied from Production or exposed as NEXT_PUBLIC variables.

Before applying: verify private Auth redirect allowlist, email delivery configuration and CAPTCHA enforcement with authorised dashboard/management read access. Public Auth settings do not expose these controls. Confirm inherited Stripe and other providers cannot invoke a real-money/live environment; the controlled execution proof must use only the bounded synthetic destination. No test mode may bypass security controls.

The current authorisation permits preparation/read-only inspection, not cloud environment updates, hosted migration application or synthetic writes. These remain explicit separate approval gates. No new infrastructure is needed.

