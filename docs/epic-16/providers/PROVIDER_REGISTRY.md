# Provider registry

`provider_registry` holds governance metadata, never secrets: provider/display ID, adapter/API versions, environment, enabled state, capabilities, evidence types, callback/polling modes, configuration and health state, call timestamps, timeout/retry policy, retention class, and residency notes.

`provider_state_audit` is append-only evidence for enable/disable changes. Only the service role can call `set_provider_enabled`; `/api/providers` requires existing admin allowlist and verified admin-cookie controls before invoking it. A reason and correlation ID are mandatory.

Deployment configuration and registry approval are separate gates. Credentials do not enable a provider, and registry enablement does not prove connectivity. New session creation requires both.
