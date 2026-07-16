# RC6 deployed security proof

Current deployed results: **Blocked — no target environment or credentials are linked to this checkout.**

Record each safe deployed test in `release_evidence_checks` with category `security`, environment, timestamp, status and a non-secret evidence reference. Required checks cover authentication, email verification, session expiry, password reset, logout, admin allowlist and verification, protected pages/APIs, read/write RLS denial, tenant isolation, webhook rejection, rate/size limits, audit retention, revoked/expired authority and kill switch.

Never store passwords, tokens, keys, signatures, raw payloads or personal data in the evidence record. Source inspection cannot be recorded as `passed`.
