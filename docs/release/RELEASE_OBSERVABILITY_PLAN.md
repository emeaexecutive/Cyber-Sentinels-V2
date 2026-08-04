# Release Observability Plan

- Migration failure: alert on unexpected migration head and migration duration.
- Schema-cache failure: alert on cache miss and schema mismatch.
- RPC failure: alert on RPC status 5xx and denied access.
- RLS denial: alert on repeated denies and cross-tenant rejection counters.
- Trust Object composition failure: alert on composition errors and missing evidence references.
- Replay failure: alert on generation failure and replay unavailability.
- Release-health mismatch: alert on incompatible or incomplete health result.
