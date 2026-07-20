# Consent Receipts

Consent Receipts™ are append-only, tamper-evident and integrity-verifiable. They are not described as immutable.

The receipt canonicalizes all required identity/pseudonym, version, profile, language, category, purpose, provider, action, timestamp, expiry, source and integrity fields with RFC8785-JCS rules. SHA-256 covers the canonical object without `receiptHash`. Retrieval recomputes the hash from the stored canonical record and returns `integrity_valid`.

Allowed actions are ACCEPT_ALL, REJECT_OPTIONAL, SAVE_PREFERENCES, WITHDRAW, POLICY_RECONSENT and SYSTEM_MIGRATION. A subject-scoped idempotency key plus request digest returns the original receipt for an exact retry and rejects a changed body. Exact retries retain the original expiry.

Receipts retain no full IP, raw user-agent, access token, authentication secret, precise location or unrestricted device fingerprint. Coarse country and a user-agent digest are optional.
