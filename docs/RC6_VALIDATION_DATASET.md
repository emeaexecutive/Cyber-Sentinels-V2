# RC6 validation dataset

Dataset: `release-1-candidate` version `1.0.0-rc6-pending`. Fixture count: **30 pending**. Current approved count: **0**.

The fixture set contains internally authored, non-personal, deterministic product-behavior scenarios. It is safe test coverage, not reviewed ground truth. `release_validation_cases` accepts the required case ID, dataset version, entity/workflow scope, sanitized evidence, expected and actual outcomes, ground truth, reviewer attribution, timestamp, confidence, provenance, usage boundary, limitations and evidence references.

Import rules:

- use only approved synthetic fixtures, consented internal outcomes, provider sandbox results, or licensed public benchmarks;
- store metadata and safe evidence references, never sensitive identity or biometric material;
- set new cases to `pending`;
- do not set `approved` outside the protected review function;
- do not combine dataset versions, workflows, providers, signal types or rulesets into one universal accuracy claim.

Until 30 approved cases exist, the required state is `Calibration Incomplete`.
