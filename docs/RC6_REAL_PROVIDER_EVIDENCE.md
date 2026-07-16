# RC6 real provider evidence

Selected provider: **Hopae Connect**. Current state: **Awaiting Credentials**.

The repository contains request creation, signed/timestamped callback validation, idempotency, safe normalization, evidence quality, authority and policy evaluation, decision/enforcement, and atomic Replay, Evidence Graph, Trust Memory and Evidence Pack persistence. Those source capabilities are not a real target-environment run.

To retain `Live`, record one evidence check named `real_target_environment_flow` with a target environment, timestamp and non-secret evidence reference only after credentials and migration are verified and the complete flow succeeds. Also retain `reviewed_provider_outcome`. No such evidence is present in this checkout.

Failure tests required in the target environment: missing/invalid credentials, timeout, malformed/forged/stale callback, duplicate event, cross-tenant reference, unknown workflow, rejected/insufficient evidence and provider unavailability after request creation.
