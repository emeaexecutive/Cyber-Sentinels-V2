# Provider privacy and retention

Raw callback bodies exist only in memory for size validation, HMAC verification, JSON parsing, SHA-256 digesting, and normalization. The callback ledger stores the digest and sanitized references. `normalized_identity_evidence` stores provider/session/event references, result, assurance, timestamps, mapping version, safe attributes, limitations, and trust links.

Prohibited persistence/logging includes identity documents, passport or face images, biometric templates, upstream claims, identity subject profile, access/ID/bearer tokens, client/webhook secrets, and full provider responses. Sprint 16.1B does not use the existing evidence vault for Hopae raw payloads.

Default operational snapshot retention is 90 days and normalized evidence retention is 365 days, subject to enterprise policy, lawful basis, residency review, legal hold, and approved deletion procedures. Retention deletion must preserve required audit continuity and never delete migrations.
