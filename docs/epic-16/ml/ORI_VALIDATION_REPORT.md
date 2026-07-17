# ORI Validation Report

Current status: **ML Validation Incomplete**.

| Evidence | Current value |
| --- | --- |
| Controlled synthetic rows | 8 |
| Eligible non-synthetic reviewed rows | 0 |
| Minimum eligible reviewed rows | 30 |
| Precision / recall | Unavailable |
| False-positive / false-negative rate | Unavailable |
| Reviewer agreement | Unavailable |
| Calibration | `INSUFFICIENT_REVIEWED_GROUND_TRUTH` |

Local tests cover deterministic extraction, normalization boundaries, schema and scope validation, coverage abstention, hash tampering, floating-point boundedness, band mapping, explanation ordering, sensitive-field exclusion, shadow/advisory non-enforcement, persistence failure isolation, synthetic labels, API protection, and source-level RLS policy controls.

Production metrics remain null until at least 30 non-synthetic, governance-approved reviewed records include an approved expected class. Reviewed outcomes do not trigger automatic retraining or threshold changes.
