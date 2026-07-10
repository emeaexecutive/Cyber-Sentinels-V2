# Content Governance

Release: 0.4 Enterprise Experience

## Rule

Every major concept has one canonical home. Other pages may reference the concept and link to the canonical home, but should not redefine it.

## Canonical Terms

- Trust Memory
- Runtime Trust
- Persistent Trust Posture
- Governance
- Replay
- AI Sovereignty
- Evidence boundaries
- Provider transparency
- Enterprise trust record

## Duplication Guardrails

- Before adding a new section, check `docs/INFORMATION_ARCHITECTURE.md`.
- If a section explains architecture, it belongs on `/platform`.
- If a section explains replay, sovereignty, trust principles or evidence boundaries, it belongs on `/trust` or a Trust Center child page.
- If a section explains a business problem, it belongs on `/solutions` or a solution detail page.
- If a section explains buying confidence, pilot fit or enterprise objections, it belongs on `/enterprise`.
- If a section explains APIs, auth, events or integration steps, it belongs on `/developers`.

## CTA Guardrails

- Use one primary CTA per page section.
- Use at most one secondary CTA beside it.
- Do not repeat the same CTA block in consecutive sections.
- Keep protected operational CTAs clearly separate from public marketing CTAs.

## Copy Guardrails

- Do not claim perfect identity certainty, autonomous truth detection or unsupported ML capability.
- Keep provider status explicit: Live, Simulated, Awaiting Credentials or Disabled.
- Use "evidence-backed review context" instead of black-box scoring language.
- Use "governed trust record" or "enterprise trust record" when describing the cross-workflow product value.
- Avoid introducing new branded concepts unless they replace an existing term and are added to the canonical map.

## Page Review Checklist

- Does this page have one clear job?
- Does it repeat a concept whose canonical home is elsewhere?
- Can architecture detail be replaced with a link to Platform?
- Can replay or sovereignty detail be replaced with a link to Trust Center?
- Are there more than two CTAs in the section?
- Does the page include repeated cards, repeated paragraphs or duplicated diagrams?
- Would a buyer understand the page in one scan?

## Release 0.4 Acceptance Criteria

- Public navigation uses the simplified IA.
- Homepage answers the five buyer questions.
- Solutions describe business problems, not architecture.
- Platform owns architecture concepts.
- Trust Center owns Replay and AI Sovereignty.
- About is footer-only.
- Documentation exists for audit, IA and future content governance.
