# Enterprise Trust Report

Baseline commit: `77588a5`

Product review date: 2026-07-18

## Purpose

An Enterprise Trust Report explains a recorded workflow decision to security, compliance, audit, investigation and business reviewers. It is a portable explanation, not a certification, fraud guarantee, biometric verdict or substitute for source evidence.

Current report building is centered on `lib/trust-transparency.ts`, trust evidence packs, verification receipts and Replay-backed trust views. Reports retain missing states such as `not recorded` instead of fabricating completeness.

## Required report contract

| Section | Required content | Current coverage |
| --- | --- | --- |
| Decision | Decision state, time, reason, reviewer/override and next action | Outcome/posture, explanation and governance actions are present; complete decision envelope is not universal |
| Timeline | Deterministic chronology with actors and state changes | Replay chronology counts and views are present |
| Evidence Summary | Attributed references, provider participation, quality and limitations | Present in transparency/evidence packs |
| Replay Reference | Replay ID, integrity/completeness and link | Reference supported; can truthfully be `not recorded`/pending |
| Policy Evaluation | Policy ID/version, rules evaluated and outcome | RC1 pack supports supplied values; base pack defaults to `not recorded` |
| Trust Score | Score, confidence, scale, algorithm version and meaning | Runtime records a workflow posture score; not all reports receive version/score |
| Risk Summary | ORI mode, score/band, confidence, version and limitations | Not a universal current report section; ORI may be off or post-decision |
| Recommendations | Next action, human review requirement and owner | Governance/escalation paths and actions exist; ownership can be missing |

## Report identity and metadata

Every report should include report ID/schema version, generated time, tenant/workflow/subject, decision ID, original decision time, report audience, data classification and export integrity digest. Report generation time must not be confused with decision time.

## Decision language

- “Verified” means the workflow was allowed under the recorded policy and evidence, not that every claim or person is universally authentic.
- “Verification Required” states what evidence or step-up is missing.
- “Escalate” names the owning queue/reviewer and preserves the triggering reason.
- “Reject” is terminal only when policy says so; a reversible block is labelled “Suspend”.
- “Expired” identifies the input or decision validity boundary.
- Missing policy, Replay, Trust Memory or ORI references are displayed as `not recorded`, `not evaluated`, `pending` or `incomplete`.

## Evidence and provider presentation

Show normalized summaries, provider attribution, observed/expiry time, verification state, evidence digest/reference and limitations. Do not export provider secrets, full raw identity payloads or prohibited personal data. Provider agreement is supporting context, not certainty.

## Risk presentation

If ORI ran, report its mode and make clear whether it was computed after the authoritative decision. Show score/band, confidence, contributing/missing signals, model versions, abstention and recommendation. If validation is incomplete, do not publish accuracy claims. If ORI did not run, show `Not evaluated` rather than zero risk.

## Governance and audit

Name the reviewer and owner when recorded, distinguish proposed recommendation from human resolution, and preserve authorization lineage, escalation path, receipt and audit references. “Reviewer not recorded” is a defect state, not anonymous approval.

## Export formats and verification

The current evidence pack can produce bounded portable text/JSON representations. Future PDF/JSON/API formats must serialize the same versioned contract, include a canonical digest/signature where approved, apply authorization at download time and audit export. Rendering must not change state semantics or omit limitations.

## Acceptance checks

A report is complete only when required references resolve within the tenant, evidence hashes verify, chronology is ordered, policy and engine versions are present, reviewer attribution is valid where applicable, and missing inputs are visibly marked. Otherwise it remains a useful **incomplete report**, not a verified report.

## Current gaps

- Base evidence packs contain `not recorded` policy/enforcement fields until enriched.
- ORI and complete TDE version fields are not universal.
- Trust score and risk score are not consistently carried together.
- Evidence Graph references can be absent.
- Portable export integrity and deployed authorization require environment-level verification.
