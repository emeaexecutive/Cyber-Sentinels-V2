# Hopae operations runbook

1. Confirm migration state and deployment environment.
2. Configure server-only variables and approved Hopae callback URL `/api/providers`.
3. Keep the registry disabled while running configuration and sandbox checks.
4. Run unit/static suites, then the opt-in sandbox harness with an approved Hopae test eID.
5. Validate signed, forged, old, future, duplicate, oversized, wrong-content-type, timeout, 429, and 5xx behavior.
6. Audit-enable the provider with a change reason.
7. Monitor configuration, connectivity, execution, callback, and evidence-pipeline health separately. Missing measurements remain `UNKNOWN`/`Awaiting data`.
8. On provider outage, block new provider-dependent establishment or route to governed step-up/review. Never treat outage as fraud or verification success.
9. For callback failures, compare provider event/request IDs and source digests; never request or log raw documents, tokens, or secrets.
10. Rotate the webhook secret in Hopae and deployment configuration together, then validate the new secret before retiring the old deployment.
