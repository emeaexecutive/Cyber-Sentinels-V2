# Hopae rollback

1. Admin-disable `hopae_connect` through `PATCH /api/providers` with an incident/change reason. This creates `provider_state_audit` evidence.
2. Set `HOPAE_ENABLED=false` in deployment configuration and redeploy.
3. Confirm new session creation is blocked and signed callbacks are acknowledged without downstream trust side effects when registry-disabled.
4. Preserve `provider_execution_records`, callback ledger rows, normalized evidence, Replay, Evidence Graph, Trust Memory, receipts, and audit history.
5. Do not delete or reverse migrations. Do not change Trust Decision behavior.
6. Remove/rotate Hopae credentials at the provider only after callback traffic and the investigation window are understood.
7. Verify other provider registry entries and workflows are unchanged.

Rollback is reversible through a new audited enable action after configuration, health, callback, RLS, and evidence checks pass.
