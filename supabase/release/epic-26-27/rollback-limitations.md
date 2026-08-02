# Rollback limitations

Epic 26/27 records are append-only and may be referenced by Replay, Trust Memory, Evidence Graph, decisions, packages, and audit history. Destructive rollback is unsupported. If isolated staging validation fails, stop writes to the affected capability and create a new forward migration. Do not drop historical records, rewrite merged migrations, or alter a remote migration ledger.
