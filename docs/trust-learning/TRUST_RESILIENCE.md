# Trust Resilience

Resilience analysis evaluates whether a captured decision remains supportable when a provider or evidence source is unavailable. It checks independent evidence, reconstructable authority, Replay availability, affected objects/workflows and established outcomes.

Supported states are `resilient`, `partially_resilient`, `single_source_dependency`, `evidence_gap`, `authority_gap`, `provider_dependency`, `recovery_required`, and `unknown`. The analyzer never infers redundancy without an approved independent source and never treats an absent business-outcome record as confirmed.

Assessments are tenant-bound derived records with source references and deterministic digests. They do not mutate provider configuration, evidence or decisions.
