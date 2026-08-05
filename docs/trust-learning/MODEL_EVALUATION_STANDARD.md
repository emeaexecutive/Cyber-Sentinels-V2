# Model evaluation standard

Evaluation is offline and tenant-isolated. Required measures are citation precision, unsupported-claim rate, contradiction preservation, missing-evidence disclosure, recommendation-policy conformity, retrieval relevance, narrative consistency, tenant isolation, sensitive-data leakage and deterministic-fallback availability.

Minimum technical thresholds are: citation precision 100%; unsupported-claim rate 0; contradiction preservation 100%; missing-evidence disclosure 100%; recommendation-policy conformity 100%; tenant isolation 100%; sensitive-data leakage 0; deterministic fallback 100%. Retrieval relevance and narrative consistency require task-specific, approved labeled corpora before a promotion decision.

No empty or synthetic-only run may be represented as a successful benchmark. `not_run` is the required state without cases. Passing thresholds is necessary but not sufficient: controlled-staging promotion also requires data-rights, privacy, security, rollback and owner review. Offline results never prove Production performance.
