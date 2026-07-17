# Provider limitations

- No Hopae credentials were available during source implementation; no live sandbox or production success is claimed.
- The opt-in harness creates a sandbox session only. Human completion, userinfo, callback delivery, and trust linkage require an approved test eID and target deployment.
- Provider health snapshots and rolling latency require durable target-environment samples; local process telemetry is bounded and non-SLA.
- Hopae eID capabilities vary by selected `HOPAE_PROVIDER_ID`, plan, country, and provider. The adapter emits only the evidence actually observed.
- Userinfo may contain raw upstream claims and tokens. The adapter extracts approved summaries and discards the response after normalization.
- Provider outage does not indicate identity fraud. Callback signature failure is an operational security event, not identity evidence.
- A provider result cannot grant authorization. Authority, policy, evidence quality, and the canonical Trust Decision remain decisive.
- Production readiness remains blocked until migration, credentials, audited enablement, live callback/RLS/degraded-path evidence, review, and deployment configuration are verified.
