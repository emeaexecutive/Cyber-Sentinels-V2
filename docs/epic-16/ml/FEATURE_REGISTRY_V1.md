# ORI Feature Registry V1

Schema `1.0.0`; registry SHA-256 `9a6dc23b9aa827b2d6f730c4b8b26bc26f63617624ee0a20faffc59fc7647f1c`.

| ID | Type / range | Source | Normalization | Missing | Sensitivity | Retention and limitation |
| --- | --- | --- | --- | --- | --- | --- |
| `identity_verification_present` | boolean | Normalized Trust Decision identity evidence | false=0, true=1 | Abstain | Internal | Boolean only; presence is not validity or authorization. |
| `identity_evidence_age_days` | integer 0..365 | Normalized evidence timestamp | UTC whole days, clip trusted extraction, min-max model scaling | Abstain | Internal | Age only; freshness is not quality. |
| `evidence_freshness_ratio` | number 0..1 | Derived evidence age | `max(0, 1-age/90)` | Abstain | Internal | Ratio only; freshness is not authenticity. |
| `missing_evidence_ratio` | number 0..1 | Extraction coverage | missing approved fields / approved field count | Abstain | Internal | Aggregate only; availability is not correctness. |
| `replay_available` | boolean | Trust Workflow Executor | false=0, true=1 | Abstain | Internal | Boolean only; availability is not completeness. |
| `trust_memory_prior_review_count` | integer 0..20 | Governance history supplied to Trust Decision | clip trusted count, min-max model scaling | Abstain | Confidential | Aggregate only; history does not establish present risk. |
| `authority_scope_mismatch` | boolean | Existing intent-risk boundary | `intentRisk > 80` | Abstain | Confidential | Boolean only; deterministic boundary is not malicious-intent proof. |

All seven features support model `1.0.0`. Unknown, inactive, duplicate, incompatible-schema, malformed, out-of-range, unreferenced, or cross-scope values are rejected. Internal normalization clips only trusted extracted counts and ratios; externally supplied invalid values are never silently coerced.

Excluded candidate features lacked reliable normalized evidence in the current pipeline: provider agreement/disagreement counts, failed verification history, runtime policy-violation count, request velocity, callback count, device/session change, geographic consistency, credential age, and step-up completion.
