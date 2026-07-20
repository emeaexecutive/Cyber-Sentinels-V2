# Provider Independence

The canonical groups are `government_identity`, `identity_orchestration`, `device_reputation`, `email_reputation`, `phone_reputation`, `network_risk`, `behavioral_signal` and `enterprise_authority`.

An observation inherits its group from the capability registry, never from caller-supplied claims. Multiple observations sharing an upstream correlation key receive the configured correlation penalty after the first deterministic observation. Several providers in one group still count as one independent group for threshold satisfaction. Correlation penalties and group assignments are persisted in decision evidence so reviewers can see why apparently numerous signals did not establish independence.

Unknown providers have no independence group and contribute zero. Evidence digests are deduplicated before weighting. Superseded observations are removed from the active snapshot.
