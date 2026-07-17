# Epic 16 — Production Quality, ML Assurance, and Platform Remediation

Epic 16 introduces Operational Risk Intelligence (ORI) as a governed evidence-producing subsystem inside the existing Cyber Sentinels trust architecture.

ORI consumes normalized operational evidence only after Replay, Evidence Graph, and Trust Memory context is available. Its output is a shadow recommendation for comparison and review. The authoritative Trust Decision, external authorization, policy evaluation, provider evidence, and human governance remain unchanged.

Sprint 16.1A delivers one fixed logistic-regression artifact, a versioned seven-feature schema, deterministic extraction and inference, explanations, abstention, tenant-scoped persistence, immutable reviewer outcomes, validation gating, protected operational UI, and source-level RLS tests.

The capability defaults to `off`. `shadow` is the first permitted enabled mode. `advisory` remains non-enforcing. No enforcement mode exists.

Hopae production work, Turnstile work, and media-authenticity provider selection remain locked to later sprints.
