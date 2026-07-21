# EPICs 17.1D–17.2 Architecture Review

Date: 2026-07-21
Scope: actual `main` worktree at review time. This document does not assert deployed configuration.

## Executive finding

EPIC 17 established three credible foundations: an append-only Canonical Trust Event gateway, an enterprise consent ledger, and a capability-aware Provider Consensus Engine. The principal architectural defect was that `persist_consensus_decision_v1` also updated `subject_trust_state`, making the recommendation engine an authority for current state. EPIC 18 corrects that boundary in the forward migration `supabase/migrations/202607210001_enterprise_trust_architecture.sql`: consensus persists recommendation lineage only and `apply_trust_state_decision_v1` is the sole current-state mutation path.

## Classification

| Subsystem | Classification | Evidence and disposition |
|---|---|---|
| Canonical event schema and event IDs | KEEP | `src/lib/trust-events/types.ts`, `event-types.ts`, and `canonicalize.ts` enforce UUIDs, registered types and normalized values. |
| JCS and SHA-256 implementation | CONSOLIDATE | EPIC 17 implementations now delegate to `src/lib/trust-core/canonicalize.ts` and `hash.ts`; imports remain compatible. |
| Event chain and append RPC | KEEP | `src/lib/trust-events/gateway.ts`, `repository.ts`, and migration `202607200001_canonical_trust_event_foundation.sql` provide idempotency, sequence, prior hash and compare-and-set append behavior. |
| Evidence references | EXTEND | Legacy string references are preserved; structured `trust_references` and first-class `EvidenceObject` contracts are now canonical. |
| Replay compatibility | KEEP | Canonical event ordering and decision lineage remain readable; architecture replay adds historical policy, health, consent and state inputs. |
| Consent actions and UI | KEEP | `src/components/consent/*`, `src/lib/consent/service.ts`, and `/api/consent*` cover Accept All, Reject Optional, preferences, withdrawal, receipts and timeline. |
| Consent receipt integrity | CONSOLIDATE | Receipt signing remains; new inserts materialize a tenant-scoped Consent-domain Evidence Object through the EPIC 18 migration. |
| Google Consent Mode and tracker blocking | KEEP | `src/lib/consent/google-consent.ts`, `tracker-loader.ts`, `integrations.ts`, and `cookie.ts` preserve fail-closed optional tracking. |
| Consent SQL and RLS | KEEP | Migration `202607200002_enterprise_trust_consent_manager.sql` denies anonymous access and uses tenant-scoped policies/service RPCs. |
| Provider capability truth | KEEP | `src/lib/consensus/provider-capabilities.ts` and `provider-registry.ts` distinguish active, unavailable, disabled and unsupported providers. |
| Health, freshness and independence | KEEP | `health.ts`, `freshness.ts`, `independence.ts`, `conflicts.ts` and `engine.ts` provide health multipliers, expiry, group correlation penalties and conflicts. |
| Decision lineage | KEEP | `decision-lineage.ts`, `repository.ts`, `replay.ts` and consensus tables retain immutable hashes and evidence links. |
| Consensus as current-state authority | DEPRECATE | Direct `subject_trust_state` mutation in migration `202607200003_provider_consensus_engine.sql` is superseded by the EPIC 18 replacement function. |
| Trust State Engine | EXTEND | `src/lib/trust-state/*` adds nine explicit states, fail-closed transitions, revocation protection and stale-evidence rules to the retained EPIC 17 foundations. |
| Cross-domain registry and contracts | MISSING → IMPLEMENTED | `src/lib/trust-architecture/*` and the EPIC 18 migration add versioned domains, Evidence Objects and Decision Contracts. |
| Production migration/deployment evidence | BLOCKED | No EPIC 18 Supabase migration application or Vercel Production deployment was requested or verified in this worktree review. |

## Duplicate concepts consolidated

- Canonical JSON, UTC normalization and SHA-256 existed in Trust Events and were reused by consent/consensus. `src/lib/trust-core` is now the implementation owner; legacy modules delegate to it.
- Evidence existed as event strings, consent receipts, provider observations and an EPIC 17 storage table. EPIC 18 extends `public.evidence_objects` in place and adds structured references; it does not create a second evidence ledger.
- `consensus_decisions.state` is retained as a backward-compatible recommended-state field. It is not current trust state. Authoritative transitions live in `trust_state_decisions`.
- Existing Replay surfaces remain compatible; architecture replay composes them through immutable decision/evidence/policy timestamps.

## Data and backward-compatibility risks

1. The EPIC 18 migration must be applied after all three 20260720000x migrations. Applying code before SQL will make new repositories fail closed.
2. Existing `evidence_objects` rows are backfilled as `IDENTITY`, `INCONCLUSIVE`, `NONE` because historical rows do not contain enough truth to infer stronger classifications.
3. Old consensus rows retain their prior recommended `state`; they are not rewritten as Trust State decisions. Historical current-state provenance is therefore only complete after the EPIC 18 cutover.
4. `subject_trust_state.current_decision_id` remains for compatibility with existing readers; `current_state_decision_id` is the new authoritative lineage pointer.
5. Consent and observation Evidence Object triggers cover new inserts, and the forward migration materializes existing rows fail-closed. Production backfill volume and lock duration must be measured before application.
6. Unknown domains, invalid policies, orphan graph edges and cross-tenant keys fail closed.

## Hopae, World ID and placeholder truth

- Hopae’s signed, server-verified, tenant-scoped, idempotent and persisted path remains in `src/lib/trust-events/gateway.ts` and its adapter/repository path. Capability version `consensus-capability-v2` requires cryptographic and server verification before positive weight; EPIC 18 does not weaken timestamp, replay, envelope reservation or persistence checks.
- World ID remains zero-positive: the provider capability registry blocks positive weight, observation materialization maps it to `INCONCLUSIVE` without server verification, and the Trust State Engine rejects a positive World ID-only claim.
- Disabled, unsupported, unavailable, mock and placeholder sources cannot create positive Evidence Objects or positive state transitions.

## Production blockers and remediation order

1. Review the forward migration on a restored Production-sized database and measure locks/backfill runtime.
2. Apply migrations in a controlled Supabase change window; run orphan, RLS and tenant-isolation probes.
3. Run lint, typecheck, full tests, Production build and `verify:18` with Production-equivalent environment validation.
4. Verify Vercel project/environment/domain state directly. Repository configuration alone is not deployed evidence.
5. Only after an explicit Production deployment request, deploy the prebuilt artifact and execute the live verification matrix.
