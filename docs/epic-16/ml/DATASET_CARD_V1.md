# ORI Dataset Card V1

`ori-synthetic-v1` contains eight controlled, non-personal fixtures in `lib/operational-risk/synthetic-dataset.ts`: two expected low, two moderate, two high, and two abstention cases.

| Property | Value |
| --- | --- |
| Size | 8 |
| Synthetic | 8 (100%) |
| Reviewed production or pilot | 0 (0%) |
| Feature schema | `1.0.0` |
| Approval | `APPROVED_FOR_CONTROLLED_TEST` only |
| Reviewer references | None |

Each row retains dataset version, synthetic status, expected class, null reviewer reference, feature-schema version, controlled source, approval state, feature values, and limitations.

Intended use is deterministic behavior, boundary, band, abstention, and demo testing. Prohibited uses include production training, automatic retraining, online learning, accuracy claims, identity verification, authorization, biometric inference, protected-characteristic inference, customer ranking, or consequential automated decisions.

The dataset excludes production records, raw provider payloads, passports, images, audio, biometrics, document contents, personal text, emails, identifiers, secrets, and tokens. Synthetic performance is not real-world accuracy.
