# Hopae Release 1 runbook

Required names: `HOPAE_ENABLED`, `HOPAE_ENV`, `HOPAE_CLIENT_ID`, `HOPAE_CLIENT_SECRET`, `HOPAE_WEBHOOK_SECRET`, `HOPAE_API_BASE_URL`, `HOPAE_CONNECT_ISSUER`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

1. Apply RC1 and RC6 migrations.
2. Set `HOPAE_ENABLED=true`; configure approved target endpoints and secrets server-side.
3. Register `${NEXT_PUBLIC_SITE_URL}/api/providers`.
4. Run `npm run check:hopae`; only variable names and evidence metadata are returned.
5. Create an authenticated assessment session and retain its correlation ID.
6. Complete the provider flow. Confirm signature/timestamp validation, unique event, normalized evidence, authority/policy, decision/enforcement and continuity references.
7. Review the provider result and attach `reviewed_outcome_id`.
8. Use `Live` only when the current environment has a completed, linked real execution record.

Failure paths must remain actionable and non-disclosing. Rotate or revoke credentials after any incident.
