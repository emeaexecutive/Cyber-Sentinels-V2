# Trust Evidence Packs

Trust Evidence Packs are authenticated, downloadable JSON artifacts for Auditors, CISOs, Compliance and Investigations. They extend the existing audit export endpoint; no new route or evidence store is created.

## Download

From a Trust Transparency report, select `Download Trust Evidence Pack`, or request:

`/api/audit/export?workflow_id=<id>&subject_type=<type>&format=pack`

Authentication, row-level access and workflow-reference validation are inherited from the existing audit export.

## Pack contents

- Decision posture, change and rationale.
- Evidence references, provider contributions and continuity count.
- Authority lineage and the human-review boundary.
- Replay reference and chronology count.
- Trust Memory™ state and recorded references when available.
- Governance actions and escalation path.
- Operational limitations.

## Security and evidence boundary

The pack contains normalized references and summaries, not raw provider payloads, credentials or secret values. Missing evidence remains missing. A pack supports audit and investigation workflows but does not guarantee authenticity, provider accuracy, biometric certainty, fraud detection or regulatory compliance.

## Versioning

`schemaVersion: 1` and `kind: cyber_sentinels_trust_evidence_pack` identify the portable contract. Consumers must tolerate empty reference arrays and must not infer success from artifact generation alone.
