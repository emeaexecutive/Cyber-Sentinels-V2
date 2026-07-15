# Trust Evidence Packs

Release 1.2.3 supports authenticated Trust Evidence Pack downloads from the existing audit export. No new route or evidence store is introduced.

## Formats

| Format | Request | Intended use |
| --- | --- | --- |
| JSON | `format=pack` or `format=pack-json` | Machine-readable audit, investigation and integration workflows |
| PDF | `format=pack-pdf` | Portable human review and controlled evidence sharing |
| Enterprise Summary | `format=pack-summary` | Concise buyer, executive and review handoff |

All requests use `/api/audit/export?workflow_id=<id>&subject_type=<type>&format=<format>`. Authentication, row-level access, reference validation and `private, no-store` caching are inherited from the existing audit export.

## Evidence contract

Every format represents the same normalized pack:

- Decision posture, change and rationale.
- Evidence references and continuity count.
- Replay reference and chronology count.
- Trust Memory™ state, references and non-learning limitation.
- Authority lineage and authoritative human-review boundary.
- Provider participation, state, summary and evidence references.
- Governance actions and escalation path.
- Operational limitations.

## Security boundary

Packs contain normalized references and summaries, not credentials, secrets or raw provider payloads. Missing evidence stays missing. Artifact generation does not prove authenticity, provider accuracy, biometric certainty, fraud detection, regulatory compliance or production readiness.

`schemaVersion: 1` and `kind: cyber_sentinels_trust_evidence_pack` identify the JSON contract. PDF generation is deterministic and uses the same pack object. Consumers must tolerate empty arrays and explicit `not recorded` values.
