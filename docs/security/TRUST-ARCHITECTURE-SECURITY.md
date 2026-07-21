# Trust Architecture Security

Security boundaries are authentication, enterprise authorization, tenant RLS, service-only writes, append-only history, JCS/SHA-256 integrity, bounded graph traversal, safe response shaping and fail-closed state/policy validation.

Anonymous access is revoked. Authenticated users receive select-only access through tenant policies. Evidence insertion, policy publication, state decisions and simulations use service-role RPCs after application authorization. Composite graph foreign keys prevent cross-tenant edges. UI metadata filters raw payloads and credential/contact fields.

World ID is inconclusive without server verification. Placeholder, mock, disabled, unsupported and unavailable providers contribute zero positive trust. Secrets must never use `NEXT_PUBLIC_` names or appear in client bundles.
