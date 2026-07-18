# Trust reports

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Purpose

Trust reports turn operational evidence into reviewable, exportable buyer and operator records. This document inventories the current reporting experience; the normative field contract remains [`trust-report.md`](./trust-report.md).

## Current report surfaces

| Surface | Audience | Current capability | Boundary |
| --- | --- | --- | --- |
| `/trust/transparency` | Authenticated operator, reviewer or buyer delegate | Workflow report with decision explanation, evidence continuity, Replay reference, provider evidence, governance history, evidence references and authorization lineage | Uses an accessible workflow when supplied; otherwise the page may present explicitly labelled demonstration data |
| `/trust/receipt/[id]` | Authenticated evidence reviewer | Verification receipt and linked decision/evidence detail | Record access remains subject to authentication and data policy |
| `/verification-receipts` | Public evaluator | Explains the receipt concept | It is explanatory, not access to protected operational evidence |
| `/api/audit/export` | Authenticated export consumer | Evidence-pack JSON, PDF, enterprise summary, text and base JSON | A valid reference is required; response is an attachment with private, no-store caching |
| `/compliance-export` | Authenticated legacy experience | Demonstration report selection and export explanation | The page still states that PDF generation is unavailable and is inconsistent with the canonical audit export API |

## Report contract

A complete report should make the following review chain understandable without requiring database access:

1. report identity, generated time, environment and scope;
2. subject or workflow reference without unnecessary personal data;
3. trust decision, confidence state and decision explanation;
4. operational risk summary when a supported ORI result exists;
5. evidence references, evidence integrity and missing-evidence notices;
6. policy and policy-version references where recorded;
7. identity and authorization lineage;
8. provider execution evidence and declared health/readiness state;
9. governance actions, reviewer attribution and unresolved escalation;
10. Replay reference and continuity status; and
11. retention, redaction and export provenance.

Unavailable fields must be labelled `Awaiting data`, `Not recorded` or another approved state. They must not be inferred from adjacent evidence.

## Required report sections

| Section | Current source | Content boundary |
| --- | --- | --- |
| Executive Summary | Trust Transparency decision explanation and enterprise summary export | Outcome, confidence/state, accountable owner and material limitation; no invented assurance score |
| Trust Timeline | Replay chronology and governance history | Ordered material events with source/time and explicit gaps |
| Replay Reference | Replay session/reference in transparency and receipt records | Durable lookup reference and continuity state, not a claim that every event was captured |
| Evidence Summary | Evidence continuity, provider evidence and evidence references | Present, missing, expired or contradictory evidence with attribution |
| Risk Summary | Decision reason, flags and supported ORI output where available | Omit or label `Awaiting data` when no governed/calibrated risk result exists |
| Policy Evaluation | Governance history and policy reference where recorded | Policy ID/version, result and exceptions only when retained upstream |
| Recommendations | Current owner, unresolved review and next action | Evidence-bound operational action; never autonomous approval or legal advice |

## Export formats

| Format | Current status | Intended use |
| --- | --- | --- |
| PDF | Implemented by the canonical audit export API | Buyer review, assurance packet and durable human-readable sharing |
| JSON | Implemented by the canonical audit export API | Machine-readable evidence exchange and internal validation |
| API response | Implemented through authenticated audit/receipt endpoints | Controlled integration with enterprise systems |
| Enterprise summary / text | Implemented by the canonical audit export API | Concise executive or review-board brief |
| CSV | Not implemented for the Trust Evidence Pack | Tabular analysis is a future requirement only if a governed schema and safe redaction rules are defined |

Exports must preserve the same trust state as the source record. Generation may reformat evidence but must not turn missing data into evidence, change an unresolved state to passed, or expose provider secrets, raw tokens, sensitive free text or data outside the requester's authorization boundary.

## Role-based experience

- Buyers receive a concise outcome, assurance boundary, unresolved risks and links to supporting evidence.
- Technical evaluators receive identity, provider, policy, evidence and Replay lineage.
- Governance reviewers receive pending decisions, reviewer actions, escalation history and evidence gaps.
- Administrators receive operational diagnostics and export provenance, not authority to rewrite historical evidence.
- Auditors receive immutable references and clearly declared limitations.

## Current gaps

- The legacy `/compliance-export` wording conflicts with the working canonical PDF export and should be retired, redirected or explicitly labelled legacy after product review.
- CSV is not supported.
- ORI summaries and policy-version identifiers are not universal because upstream records do not always contain them.
- Report completeness is not yet represented by one governed schema version across every receipt and export surface.
- Demonstration reports and live reports use adjacent experiences; the mode label must remain visible in every export and screenshot.
- There is no user-facing report retention, legal-hold or revocation control on the report page.
- Download analytics are not active; operational audit records must not be treated as product-analytics consent.

## Acceptance standard

A Trust Report is enterprise-ready only when a reviewer can identify its source, scope, time, decision, missing evidence, human authority, Replay lineage and export provenance; access is authorized at request time; PDF and JSON agree on material state; and no unsupported accuracy, legal-proof or compliance claim is introduced.
