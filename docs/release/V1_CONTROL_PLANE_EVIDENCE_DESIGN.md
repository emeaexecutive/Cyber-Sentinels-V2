# V1 control-plane evidence: inspected flow and bounded fix

Starting main: `fce70e052a6d6b9bbe6842755b66c7354e70c8ed`.

## Inspected flow

- `runtime.ts` registers the entity, native credential and signed public manifest; native proof establishes stored possession evidence. Granting authority binds the same entity to policy `external-agent-trust-v1:0.2.0`.
- The authority and policy require native identity plus `SERVER_VERIFIED_AGENT_CONFIGURATION` and `SERVER_VERIFIED_MONITORING_HEARTBEAT`. `canonical.ts` checks required types and current evidence; absent types produce REVIEW.
- `requestExternalDecision` calls `establishTrustedStagingEvidence` before the canonical adapter loads `evidence_objects`. That producer is synthetic and its boundaries prohibit Production.
- The only heartbeat producer found is the synthetic Staging observation. There is no signed external heartbeat ingestion route to reuse.
- The native architecture already supports signed manifests, Ed25519 verification, server-computed manifest digests and public-key fingerprints. A signed configuration is an authenticated declared configuration, not independent runtime attestation.
- `evidence_objects` has a unique `evidence_id`, normalized facts, freshness and verification fields. One array insert can atomically persist the configuration/heartbeat pair. Deterministic IDs scoped to tenant, agent and event prevent replay without a new table or mutable replay cache.

CURRENT REVIEW CAUSE = two required verified evidence types have no legitimate Production producer.

CONFIGURATION EVIDENCE SOURCE = current stored native entity, signed manifest, credential, native verification and identity evidence, bound to current authority and policy.

MONITORING EVIDENCE SOURCE = a real external agent's signed, timestamped, unique control-plane heartbeat observed by the server.

MINIMAL PRODUCTION FIX = one bounded authenticated heartbeat endpoint, pure cryptographic/binding validation, an atomic existing-ledger writer, and current-baseline eligibility checks when canonical decisions consume those records. SDK/OpenAPI support and regression tests accompany that endpoint.

## Security and meaning

Provenance is `CYBER_SENTINELS_CONTROL_PLANE_VERIFIED`, with first-party provider key `cyber_sentinels_native`. It asserts no third-party independence. Existing required evidence types, assurance requirements, policy, authority checks and synthetic boundaries remain unchanged.

The signed envelope binds tenant derived from the API principal, agent, credential, event ID, timestamp, environment, authority and policy references, and a domain-separated audience. The request body cannot supply tenant, verification/result/assurance fields. Maximum age and future skew are bounded; stored expiry is no later than heartbeat freshness or any baseline expiry. Duplicate IDs fail atomically, including concurrent requests.

Decision-time eligibility rechecks live baseline linkage so rotated/revoked credentials, changed manifests, authority/policy changes and expired heartbeats cannot leave old positive control-plane records eligible for ALLOW. Missing/ineligible proof remains non-ALLOW; repository failure fails closed.

Monitoring means only a current, authenticated signed control-plane observation. It does not attest actual runtime configuration, downstream execution, target acceptance or business outcome. Signed configuration proves correspondence to the stored signed declaration, not what arbitrary code executed elsewhere.

No new migration or environment variable is expected: existing ledger uniqueness/RLS and the public API authentication/configuration are reused. This expectation must be verified against the live schema before release.

## Verified implementation details

Production read-only catalog inspection confirmed the unique `evidence_id` index, enabled RLS, no `anon` or `authenticated` INSERT privilege, service-role INSERT privilege, and tenant-scoped metadata SELECT policy. No migration is needed.

The endpoint uses the existing `agents:verify` permission and proof rate-limit class. The tenant and client binding are resolved before baseline reads. The signing domain is `cyber-sentinels:control-plane-heartbeat:v1`; the configured audience is `https://www.cybersentinels.com/api/v1`. Maximum heartbeat age is 120 seconds, future skew 30 seconds, and retained decision eligibility at most 300 seconds, capped by baseline expiries.

Native `PARTIALLY_VERIFIED` is accepted only when all four identity claims are verified, the owner is confirmed, there are no conflicts, and the only unverified claims are runtime binding/software provenance. Those claims remain explicitly unattested. This matches the existing native identity semantics; it does not promote an incomplete identity or fabricate runtime attestation.

Canonical ledger loading filters the new provenance before deduplication for all canonical consumers. It rechecks the current baseline and reconstructs the original signed observation, its deterministic ID, facts hash and expiry. Both matching evidence types must remain present and eligible. A historical record remains readable after revocation, but cannot authorize a new action.

The preceding NO-GO evidence in PR83 remains historical evidence. This change and its new qualification use `v1-control-plane-production-proof`; they do not overwrite the previous run.
