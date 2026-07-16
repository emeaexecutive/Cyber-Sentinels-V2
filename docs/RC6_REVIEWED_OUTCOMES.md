# RC6 reviewed outcomes

The existing protected `/admin/reviews` surface owns Release 1.0 ground-truth review. It supports `pending`, `reviewed`, `disputed`, `excluded` and `approved`.

Approval requires a ground-truth label, reviewer identity and role, timestamp, confidence from 0 to 1, rationale and at least one retained evidence reference. Uncertainty and disagreement remain explicit. Each transition is appended to `release_validation_reviews`; the current state is retained on `release_validation_cases`.

Only `approved` cases enter precision, recall, false-positive, false-negative, unknown, calibration or agreement metrics. Current reviewed/approved outcomes: **0/0**. Precision and recall: **Awaiting Data**.
