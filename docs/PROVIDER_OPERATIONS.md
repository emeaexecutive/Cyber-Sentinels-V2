# Provider Operations

## Canonical surface

The existing protected `/admin/provider-status` route is the Provider Operations page. The provider registry remains canonical.

## Adapter classification

Every adapter is classified as exactly one of:

- Production;
- Sandbox;
- Awaiting Credentials;
- Prototype;
- Disabled.

Production requires a production-capable adapter, credentials, a successful real check, normalization, timeout handling and audit logging. Credentials alone never produce Production.

## Normalized health

Every adapter exposes availability, latency, last successful request, credential status, supported signals, confidence, error rate and retry state. Missing measurements display `Unavailable` or `Unknown`. Error rate is limited to retained health observations and is not an SLA.

## Current readiness

Hopae Connect remains the production-candidate path but is Awaiting Credentials in this checkout. No provider is claimed Production without successful real health evidence. Detection adapters remain Prototype until endpoint-specific production execution and reviewed validation exist.
