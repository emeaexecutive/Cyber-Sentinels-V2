# Provider-neutral evidence Preview proof

## Release identity

- Pull request: PR #29, `Release closure: RC2 readiness and canonical trust transaction`.
- Qualified implementation commit: `22780dfd60e606677ede2171f46ed8a60d8082cb`.
- Branch: `feat/product-closure-canonical-transaction`.
- Disposable Supabase Preview: `cwvftlziiatrgceeukdl`.
- Preview qualification timestamp: `2026-08-08T17:06:26.934Z`.
- Production: untouched.

The local commit, origin branch, and PR head all resolved to the qualified implementation commit before reconstruction. No force push, replacement PR, Production connection, or PR #26 change was used.

## Clean reconstruction

The disposable Preview was reset to zero without seed data and reconstructed from the committed migration directory in one uninterrupted CLI run. All 78 migrations applied sequentially from `001_initial_schema.sql` through `202608080002_provider_neutral_workspace_rls_forward_repair.sql`.

- Target migration timestamp/version: `202608080001`.
- Target migration: `202608080001_provider_neutral_evidence_independence.sql`.
- Forward RLS repair: `202608080002_provider_neutral_workspace_rls_forward_repair.sql`.
- Local and remote ledgers: 78/78 and identical.
- Post-reconstruction dry run: `upToDate: true`; no migrations, seeds, or roles pending.
- Duplicate relations, indexes, constraints, and policy names: none reported.
- Dependency-order failures: none.
- SQLSTATE errors: none.
- Manual database repair: none.

The forward repair used the canonical drift-detecting policy guard. Four legacy recursive workspace policies produced durable `REPLACED` decisions and were neutralized with fail-closed definitions while the hardened security-definer tenant policies remained authoritative.

**CLEAN SUPABASE PREVIEW RECONSTRUCTION: PASS**

## Schema qualification

Catalog queries verified the actual committed column contract rather than inferring success from the migration exit code. The reconstructed schema contains:

- canonical Operational Entities with tenant, accountable-owner, and canonical trust-object references;
- append-only external identity federation with provider-native identifiers, evidence digests, corrections, and supersession references;
- tenant-specific provider relationships with organization, role, evidence responsibility, control responsibility, and native references;
- provider transition history with prior/new relationships, frozen evidence digest, prior decision snapshot references, and migration gaps;
- provider change events with affected Operational Entities, affected controls, evidence references, and correlation;
- canonical trust transactions with Operational Entity, accountable owner, Responsibility Lineage, evidence independence, and immutable decision-time snapshot;
- canonical enforcement events with source-party attribution, source classification, evidence digest, and transaction references.

The catalog also verified the external-identity, provider-change, and enforcement append-only triggers, provider transition history trigger, decision snapshot immutability trigger, primary keys, unique constraints, checks, and foreign keys.

**FINAL SCHEMA: PASS**

## Synthetic Preview transaction

Sanitized references from the clean Preview run:

- Tenant A: `8421e083-86ec-42be-9ac2-4f4150e12bd0`.
- Tenant B: `a92a2a12-e225-4380-8d26-87812711a572`.
- Operational Entity: `entity:alpha:mskml8z9`.
- Provider A: `qual-provider-a-mskml8z9`.
- Provider B: `qual-provider-b-mskml8z9`.
- Provider transition: `4dea93a0-e293-4533-948b-3c62bb204a00`.
- Canonical transaction: `779c9147-9566-4a6a-a59d-1b3f6a0e47ff`.
- Decision: `12ccb9e6-5c97-4315-8390-3786abc470f5`.
- Decision digest: `6b525bf4a0a1f4feb597c30a25be42f8a5fbf3c6a13619971d292019d3eb9f5f`.
- Replay: `aceadfbc-000f-4756-b830-647e861e334d`.
- Trust Memory: `eca595ad-1d07-4814-b365-4a7af345c3d1`.
- External identities: `3af7f17d-8878-4a7b-ae2b-7593a1fc1d0f`, `67a86aa7-20b4-46b4-8843-e7fe044524c5`, `2fe46d32-b76a-4e80-83fb-33997cd8f11d`.

The complete chain persisted: Operational Entity, external identity, accountable owner, authority, provider evidence, consequence, decision, enforcement state, outcome state, Replay, and Trust Memory.

This used synthetic Preview providers. It is database/staging proof and is not a live external-provider claim.

## RLS and tenant isolation

Tenant A observed the expected Operational Entity, two initial external identities, two provider relationships, provider transition, provider change, canonical transaction, decision, Replay, and Trust Memory records. Tenant B observed zero rows in every corresponding table.

The qualification additionally proved:

- anonymous reads were denied;
- authenticated reads were tenant-filtered;
- authenticated target-table writes were denied;
- service-role writes remained available;
- Tenant B could not spoof Tenant A enterprise or owner identifiers;
- cross-tenant provider relationship creation was denied;
- the service-only canonical decision persistence path rejected authenticated invocation.

**PREVIEW RLS: PASS**

## Historical immutability and provider portability

Provider A evidence persisted and remained unchanged. Its correction appended a new record with explicit lineage. Provider B evidence appended under the same Operational Entity, and both provider-native identities remained attributable.

Attempts to rewrite the original external evidence, historical provider inventory, enforcement history, decision-time snapshot, or Trust Memory were rejected. The original decision digest remained `6b525bf4a0a1f4feb597c30a25be42f8a5fbf3c6a13619971d292019d3eb9f5f`. The provider transition recorded `CONTINUITY_SUPPORTED`, and Trust Memory recorded provider replacement exactly once.

**HISTORICAL IMMUTABILITY: PASS**

**PROVIDER PORTABILITY: PASS**

## Provider Exit Evidence Package

The synthetic Preview package retained provider history, Operational Entity references, policy and authority context, decisions, provider-native identifiers, evidence digests, Replay, Trust Memory, unresolved contradictions, and migration gaps.

The package sanitizer confirmed the absence of secrets, tokens, credentials, passwords, private keys, raw biometric data, and unnecessary personal data.

**PROVIDER EXIT PACKAGE: PASS**

## Replay, Trust Memory, and authenticated UI

Replay spans both provider eras with complete attribution. Trust Memory contains exactly one provider-replacement event and remains append-only.

An authenticated, short-lived Preview user rendered `/operational-entities` and `/operational-entities/entity%3Aalpha%3Amskml8z9` successfully. Both returned HTTP 200, showed two live provider rows, and contained no hard-coded demonstration state. The temporary user and membership were removed after the run.

**REPLAY: PASS**

**TRUST MEMORY: PASS**

**AUTHENTICATED PREVIEW-BACKED UI: PASS**

## Local release gates

- `npm ci`: PASS; 394 packages installed, 395 audited, zero vulnerabilities.
- `npm ls --all`: PASS.
- `npm run lint`: PASS with zero errors and two pre-existing warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS across the complete chained suite after correcting the policy migration to use the canonical guard.
- `npm run build`: PASS; 193 static pages generated and the Operational Entity routes are present.
- `git diff --check`: PASS.
- Gitleaks history scan: PASS; 609 commits, no leaks.
- Gitleaks intended-worktree and staged-diff scans: PASS; no leaks.

## Known limitations

- Hopae sandbox credentials are absent. `HOPAE = NOT_CONFIGURED`; no external response was fabricated.
- Provider A and Provider B in this proof are synthetic Preview providers.
- Production was not queried, migrated, or changed.
- Hosted checks must be evaluated against the final PR head after this evidence-only documentation update is pushed.

**PROVIDER_NEUTRAL_EVIDENCE = STAGING_PROVEN**

**LIVE_PROVIDER_PROVEN = NOT_CONFIGURED**
