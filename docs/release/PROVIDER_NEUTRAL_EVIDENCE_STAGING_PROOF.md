# Provider-neutral evidence staging proof

> Historical pre-commit staging qualification. The clean committed reconstruction is recorded in `PROVIDER_NEUTRAL_EVIDENCE_PREVIEW_PROOF.md` and is the authoritative PR #29 release artifact.

## Release identity

- Repository branch: `feat/product-closure-canonical-transaction`
- Repository HEAD at qualification: `371134c297141d954be42758c772dc89b1e49f0a`
- Workspace state: provider-neutral implementation and this proof are uncommitted; hosted checks at that SHA do not include them.
- Pull request: PR #29, open draft; no new PR created and no PR state changed.
- Environment: disposable, non-persistent Supabase Preview `cwvftlziiatrgceeukdl`.
- Qualification timestamp: `2026-08-08T15:28:28.282Z`; authenticated UI rerun completed later on 2026-08-08.
- Production: untouched.

## Migration

`202608080001_provider_neutral_evidence_independence.sql` was applied to the verified Preview connection, never through the repository-linked main project. The initial clean reset exceeded the local observation window after 61 of 77 migrations. The migration ledger was consistent, a dry run identified the exact remaining 16 migrations, and the supported forward push completed them in order.

Evidence at the initial qualification point:

- all 77 migrations through `202608080001` existed on both local and remote ledgers;
- `202608080001` existed exactly once;
- a second dry run returned `upToDate: true` with no migrations;
- target tables had RLS enabled;
- `anon` had no read privilege;
- `authenticated` had tenant-filtered reads and no target-table writes;
- `service_role` retained read/write privileges;
- append-only and decision snapshot triggers rejected rewrites.

The authenticated UI check then exposed `42P17`, caused by legacy circular policies between `trust_workspaces` and `workspace_members`. Forward repair `202608080002_provider_neutral_workspace_rls_forward_repair.sql` uses the canonical drift-detecting policy guard to neutralize only those legacy recursive grants, records the replacement decisions, and asserts the hardened tenant-read policies remain. It applied cleanly on Preview and the authenticated UI rerun passed. The final local and Preview ledgers contain all 78 migrations, `202608080002` exists exactly once, and the post-repair dry run reports no pending migrations.

Rollback is intentionally not destructive: do not drop provider-neutral evidence tables or rewrite history. If a migration fails, stop writes, preserve the ledger and evidence, correct the next forward migration, and re-run the migration dry run. The live qualification itself exercised this forward-repair strategy.

**PROVIDER-NEUTRAL MIGRATION: PASS**

## Two-tenant isolation

Opaque synthetic references:

- Tenant A: `cb721e51-275f-4691-ae1f-285b8f628fad`
- Tenant B: `e2a5c03a-e36e-4d32-a32a-f9f374243ebf`
- Operational Entity Alpha: `entity:alpha:mskj38kz`

Tenant A read the entity, two initial external identities, two provider relationships, one transition, one provider-change event, one canonical transaction, one decision, one Replay session and one Trust Memory record. Under the authenticated Tenant B role, each corresponding count was zero. Actual `anon` access was denied. Authenticated attempts to spoof Tenant A enterprise/owner fields, create a provider relationship, or invoke the service-only decision persistence path were denied.

**TWO-TENANT ISOLATION: PASS**

## Provider path and portability

This qualification used synthetic Preview providers, not a fabricated Hopae response:

- Provider A: `qual-provider-a-mskj38kz`
- Provider B: `qual-provider-b-mskj38kz`
- external identity references: `88d9be83-f185-4c9e-8da7-76c472242853`, `9f7cef02-9615-421d-858e-db8f7e7d963a`, `5b399ceb-f019-4c7f-bac9-b41fc0964037`
- transition: `9175bd1c-e2d6-4c7a-a188-99b3cffa4a4c`

Provider A original evidence remained unchanged; its correction appended a second Provider A row with supersession lineage (the third provider-evidence row overall). Provider B evidence appended under the same Operational Entity. Both native IDs remained attributable. The transition recorded `CONTINUITY_SUPPORTED`, and Trust Memory recorded provider replacement exactly once.

**PROVIDER PORTABILITY: PASS**

## Decision, enforcement and evidence independence

- Transaction: `379592e3-b56b-4479-a46d-b21be8f426bc`
- Decision: `1989f666-7eeb-4f78-b748-1dcd6699c2fd`
- Decision digest: `9e1728c4bd89f3b8eb163b5d9960ac7d453c97dded1227513ec98d790f81ce55`

The Preview record preserved provider request, provider acknowledgement, provider success claim, runtime observation and destination observation as separate enforcement events. The acknowledgement remained `acknowledged` and `provider_asserted`; it was never upgraded to confirmation. Rewriting the enforcement acknowledgement was rejected by the append-only trigger.

Contract qualification covered:

- same organization/operator/provider: `same_party_multi_system`, not independent confirmation;
- provider success without destination evidence: `PROVIDER_SUCCESS_UNCONFIRMED`;
- claimed revocation with continuing runtime access: `RUNTIME_CONTRADICTION` / access-persistence finding;
- destination confirmation: `independently_confirmed`;
- provider/destination disagreement: `conflicting`, with no misconduct inference.

Changing the provider era, appending a provider correction and attempting to rewrite the decision-time snapshot left the original digest unchanged. Triggered rewrites of the snapshot, historic provider inventory, evidence, enforcement and Trust Memory all failed closed.

## Provider exit package

The generated package contained provider/operator history, the affected Operational Entity, policy and authority references, historical decision, provider-native IDs, evidence digests, Replay and Trust Memory references, unresolved contradictions and migration gaps. The sanitized package contained no token, secret, credential, password, private key, biometric field or unnecessary personal data.

**PROVIDER EXIT PACKAGE: PASS**

## Replay, Trust Memory and UI

- Replay: `ce412e59-c998-4989-91ce-a7e1da91ba8c`
- Trust Memory: `0a934481-43da-4b99-bbb7-24da46ceb8ba`

The authenticated Preview-backed render used a short-lived synthetic auth user. `/operational-entities` and `/operational-entities/entity%3Aalpha%3Amskj38kz` both returned 200 and rendered the live entity, both provider eras, control responsibility, evidence independence, decision, enforcement/outcome, provider history, migration gap, Replay and Trust Memory. The deterministic Provider A/B demo panel was removed. The temporary user and membership were deleted after the check.

## Failure injection and validation

Provider unavailable, timeout, malformed response, missing/stale evidence, correction, provider conflict, identity mismatch, wrong entity/tenant, provider replacement gaps, runtime/destination contradiction, Replay and Trust Memory persistence boundaries are covered by the provider, canonical transaction, portability, RLS and release suites. The system fails closed, preserves evidence and does not synthesize success.

Validation results:

- `npm ci`: PASS; audit reported zero vulnerabilities.
- `npm ls --all`: PASS.
- `npm run lint`: PASS with two pre-existing warnings and zero errors.
- `npm run typecheck`: PASS.
- `npm test`: PASS after the live-data UI contract correction.
- `npm run build`: PASS; 193 static pages and both operational-entity routes present.
- focused provider-neutral tests: 27/27 PASS.
- continuous operational intelligence tests: 24/24 PASS.
- staging migration audit: 8/8 PASS after inventory update.

## Hosted and provider limitations

- Hopae sandbox variables were absent. The opt-in harness refused to run without `RUN_HOPAE_LIVE_TESTS=true`; no provider response was fabricated. `HOPAE = NOT_CONFIGURED`.
- PR #29 checks are green for committed SHA `371134c...`: repository verification, CodeQL, Gitleaks, Supabase Preview and Vercel. They do not cover this uncommitted qualification workspace.
- The Vercel Preview URL points to the committed SHA, so current live-data UI proof was run locally against the real Supabase Preview rather than misrepresented as exact-head Vercel proof.
- No commit, push, PR ready-state change or merge was performed.
- Production was not queried, migrated or otherwise changed.

**PROVIDER_NEUTRAL_EVIDENCE = STAGING_PROVEN**

**HOPAE = NOT_CONFIGURED**
