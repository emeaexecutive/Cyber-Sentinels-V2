# Rollback limitations

Epic 26/27 records are append-only and may be referenced by Replay, Trust Memory, Evidence Graph, decisions, packages, and audit history. Destructive rollback is unsupported. If isolated staging validation fails, stop writes to the affected capability and create a new forward migration. Do not drop historical records or alter a remote migration ledger.

The Epic 16 source correction is a documented exception made before first durable application. It changes names only, remains recoverable through Git history, and requires neither data rollback nor Production ledger repair.
