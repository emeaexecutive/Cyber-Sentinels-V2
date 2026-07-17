# Hopae evidence mapping

Mapping version: `hopae-connect-v1-2026-07-17`.

| Hopae input | Cyber Sentinels result |
|---|---|
| `completed` | `IDENTITY_SESSION` / `PASSED` |
| `failed`, `cancelled` | `IDENTITY_SESSION` / `FAILED` |
| `expired` | `IDENTITY_SESSION` / `INCONCLUSIVE` |
| `initiated`, `awaiting_user_action`, `authenticating` | `IDENTITY_SESSION` / `INCONCLUSIVE` |
| Unknown status | `IDENTITY_SESSION` / `UNKNOWN` |
| `hopae_loa` | Numeric assurance level, not a Trust Decision. |
| `verification_model`, `provider_id`, `acr`, LoA label | Approved normalized metadata. |
| Provenance object | Boolean `provenanceReported`; raw claims/evidence/tokens are discarded. |

Hopae Connect provides eID assertions and provenance. This adapter does not synthesize `DOCUMENT_CHECK`, `LIVENESS_CHECK`, `FACE_MATCH_CHECK`, `ADDRESS_CHECK`, `AGE_CHECK`, `EMAIL_CHECK`, or `PHONE_CHECK`. Unknown values never map to `PASSED`.
