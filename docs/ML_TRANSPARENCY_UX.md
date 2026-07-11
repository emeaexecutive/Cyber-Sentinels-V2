# ML Transparency UX

## Canonical surface

`/trust#ml-validation` is the public ML and validation transparency section. It reads the repository's existing detection and validation models rather than maintaining a separate marketing status.

## Required states

The public status distinguishes Real ML, Provider-backed detection, Heuristic baseline, Runtime intelligence, validation dataset status, precision, recall, F1, reviewed outcomes, calibration, awaiting credentials and not implemented modules.

No percentage is displayed unless it is calculated from enough reviewed data. Until the threshold is met, metric fields say `Awaiting data` and calibration says `Validation incomplete - insufficient reviewed dataset.`

## Decision boundary

ML contributes evidence. Cyber Sentinels combines evidence, policy, authority, runtime context and governance before making a trust decision.

ML can detect or score signals, compare patterns, contribute confidence and support anomaly detection. It cannot independently define truth, override governance, guarantee authenticity or replace policy enforcement.

Provider output remains evidence for review. Heuristic logic remains labelled as deterministic logic, not trained first-party ML. Runtime intelligence remains governed context, not proof of authenticity.

