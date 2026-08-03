# Rollback limitations

This release is forward-only. Append-only evidence, Trust Memory, Replay, decision, incident and audit records must not be destructively reversed. No automatic down migration, Production ledger repair or cross-environment data copy is provided.

Before a phase begins, the rollback boundary is the clean isolated staging snapshot at the preceding validated head. If a phase fails, stop without entering the next phase, preserve sanitized catalog/error evidence, and restore the disposable staging boundary only under Epic 29.3 authorization. Once synthetic writes exist, destructive rollback requires explicit owner approval and evidence-retention review.
