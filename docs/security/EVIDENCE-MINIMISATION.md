# Evidence Minimisation

The Trust Event ledger stores normalized facts, classifications, reason codes, hashes, provider references and provenance. It does not store provider request bodies. Envelope rows retain only bounded identifiers, timestamps, disposition, correlation ID, idempotency key and SHA-256 request digest.

Access tokens, refresh tokens, API keys, passwords, secrets, private keys, unrestricted prompts, full provider payloads, document images, selfies and biometric material are prohibited from normalized facts. Redaction is applied recursively before persistence and unsupported values are rejected by canonicalization.

Raw evidence, when a separately approved workflow genuinely requires it, belongs in the Evidence Vault. The ledger may store only an opaque object reference. Database constraints require Vault objects to declare encryption; `evidence_object_access` provides purpose-bound, expiring access metadata. Tenant members see normalized ledger evidence by default, not Vault objects.

Retention uses `retention_expires_at`; legal holds are explicit. Deletion or archival jobs must operate on Vault objects and their references under the runbook, never by rewriting canonical events. Event history can record a retention action without reproducing the deleted evidence.
