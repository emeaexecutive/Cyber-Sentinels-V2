# RC1 Trust Evidence Pack

The existing authenticated `/api/audit/export` route provides `pack-json`, `pack-pdf` and `pack-summary`. RC1 extends the shared pack; it does not add an evidence store or route.

Pack version `1.0-rc1` includes generation time, decision/current posture, entity/workflow, authority summary, policy, provider participation, normalized evidence references, evidence-quality status/limitations, decision reasons, enforcement/receipt, Replay, Evidence Graph, Trust Memory impact, governance status and source modes.

The pack excludes raw secrets, credentials, challenge tokens, raw documents, biometric information, excessive personal data and stack traces. Missing information is labelled `not recorded`; it is never inferred. PDF and JSON derive from one pack object. Export remains authenticated, workspace-scoped and `private, no-store`.
