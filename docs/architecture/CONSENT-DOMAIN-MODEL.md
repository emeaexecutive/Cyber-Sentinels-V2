# Consent Domain Model

The product flow is `choice → policy → Consent Receipt™ → Trust Event → Consent Timeline™ → auditable evidence`.

`consent_policy_versions`, categories, purposes, providers, cookies, trackers and region profiles describe configuration. `consent_preferences` is replaceable current state for fast decisions. `consent_receipts`, `consent_events` and `consent_audit_log` are append-only history and are never used as mutable preference rows.

A receipt belongs to one enterprise and exactly one user or rotated anonymous subject digest. Raw anonymous tokens remain in an HttpOnly first-party cookie; the database stores only their SHA-256-derived identifier. Anonymous history becomes visible to the authenticated user only while that secure token remains present, allowing a conservative anonymous-to-authenticated transition without rewriting old receipts.

The canonical Trust Event carries pseudonymous subject references, policy/region/source facts and a receipt reference. It excludes full IP addresses, user-agent strings and raw user identifiers. Each choice transaction appends both its action event and `consent.receipt.created` to the per-enterprise Trust Event chain.
