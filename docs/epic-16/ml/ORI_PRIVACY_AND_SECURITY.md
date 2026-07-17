# ORI Privacy and Security

ORI persists aggregate features and explanation summaries only. Raw passports, biometrics, images, audio, documents, provider payloads, personal free text, email addresses, secrets, tokens, and arbitrary customer content are prohibited.

| Risk | Control | Deferred evidence |
| --- | --- | --- |
| Model tampering | Canonical SHA-256 verification before inference; server-selected artifact | Deployment artifact attestation |
| Feature manipulation | Typed allowlist, strict schema/range/category checks, evidence references, tenant/session scope | Adversarial target-environment exercise |
| Poisoned reviews | Admin-authenticated service function, attributed immutable history, governance approval before dataset eligibility | Dual-review operating evidence |
| Unauthorized activation/upload | No public route; authenticated clients have no registry writes; one shadow model per scope | Deployed denial tests |
| Cross-tenant access | Authenticated trust-case scope resolution and workspace RLS | Approved tenant A/B live harness |
| Sensitive persistence | Explicit column contract, bounded notes, sanitized explanation summaries | Data-retention audit |
| Inference denial of service | 300ms default timeout, bounded feature set and response, non-blocking failure | Representative load test |
| Overreliance | Shadow labels, non-authorizing vocabulary, explicit limitations, authoritative decision comparison | Operator training evidence |
| Stale model/threshold | Versioned registries and state audit | Scheduled governance review process |
| Correlation exposure | Bounded internal correlation string; no raw identifiers in explanation | Deployment log review |

ORI failure never alters the Trust Decision. Rollback is the environment-level off switch followed by governed evidence preservation.
