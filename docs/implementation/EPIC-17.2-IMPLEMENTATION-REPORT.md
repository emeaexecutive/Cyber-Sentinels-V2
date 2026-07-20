# EPIC 17.2 Implementation Report

EPIC 17.2 implements a policy-based Provider Consensus Engine. Capability truth is centralized in a versioned, environment-aware registry; provider health is modeled independently; observations use normalized, payload-minimized schemas; and decisions record every contribution, exclusion, multiplier, conflict, threshold, reason code and integrity hash.

The engine does not count providers as votes. Effective weight combines provider capability, assurance, evidence quality, cryptographic verification, server verification, freshness, health, independence and policy. Duplicates, superseded evidence, unsupported signals, unknown providers, unavailable providers and expired observations contribute zero. Authoritative revocation and high-assurance negative evidence override weak positives.

Hopae is the only current provider eligible for positive weight, and only while enabled/configured and supplied with a valid signed normalized observation. World ID is `INCONCLUSIVE`, server verification remains pending, and its positive contribution is hard-zero. Placeholder providers are unsupported and hard-zero.

The forward-only migration creates ten tenant-scoped tables, append-only decisions/evidence/conflicts/audit history, a materialized subject state, service-only transactional RPCs, advisory locking and canonical Trust Event append operations. Twelve tenant-authorized APIs, five enterprise routes, eight required components, historical replay/simulation, tests, a verifier and operational documentation are included.

Production deployment remains blocked until the migration and live RLS are verified, production provider credentials/health are directly proven, and deployment controls are approved. This implementation does not claim those external controls.
