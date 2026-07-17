# ORI Model Card V1

| Field | Value |
| --- | --- |
| Model | Operational Risk Intelligence Logistic Baseline |
| ID / version | `ori-operational-risk-logistic-v1` / `1.0.0` |
| Algorithm | Logistic regression |
| Status | `SHADOW` |
| Feature schema | `1.0.0` |
| Dataset | `ori-synthetic-v1` |
| Thresholds | `ori-thresholds-v1` |
| Artifact | `lib/operational-risk/model-artifact.ts` |
| SHA-256 | `1af58c672114a0aeccd91f3c8c750054087cc73f02a92739bf21a9fcc0596b8a` |

The fixed coefficients are controlled placeholders for interpretable shadow behavior. They were not trained on production data and are not calibrated for a customer cohort. The artifact is canonicalized and SHA-256 verified before inference.

The model does not verify identity and does not make authorization decisions.

Permitted outputs are `NO_ADDITIONAL_ACTION`, `STEP_UP`, `HUMAN_REVIEW`, and `ABSTAIN`. They are decision-support recommendations only. Synthetic results cannot support real-world precision, recall, calibration, fairness, or safety claims.
