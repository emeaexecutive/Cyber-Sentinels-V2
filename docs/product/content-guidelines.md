# Enterprise content guidelines

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Voice

Cyber Sentinels uses calm, precise enterprise language. State what happened, what evidence exists, who remains accountable and what is blocked. Do not replace uncertainty with promotional confidence.

Use short headings, direct sentences and progressive disclosure. Executive summaries lead with outcome and risk; technical details follow through evidence, Replay and governance links. Hiring Security is a solution pattern, not the platform identity.

## Controlled terminology

| Approved term | Usage rule | Avoid |
| --- | --- | --- |
| Enterprise Trust Infrastructure | Category/deployment description for the enterprise platform | Switching between trust platform, AI safety tool and hiring product as if they were equivalent categories |
| Operational Trust | The continuously evaluated state produced by identity, policy, evidence and governance | Abstract or moral definitions of trust |
| Continuous Verification | Repeated verification across a workflow or runtime | Continuous surveillance; claims of constant coverage when checks are event-bound |
| Trust Memory™ | Product noun for governed continuity across prior trust events | Memory engine, permanent memory, or claims of immutable storage without evidence |
| Replay | Capitalized product noun for reconstructed decision chronology; lowercase only as a verb | Video replay where no video exists; audit log as a complete synonym |
| Evidence Graph™ | Product noun for linked evidence, identity, decision and governance references | Knowledge graph unless that technical implementation is specifically meant |
| Operational Risk Intelligence | Expanded on first use; `ORI` thereafter for a supported operational-risk result | Risk score when no calibrated ORI result exists |
| Trust Decision Engine | Expanded on first use; `TDE` thereafter for the decision mechanism | AI judge, autonomous authority or final decision-maker |
| Provider Neutral | Label or noun phrase; use `provider-neutral` as an adjective | Provider-independent if a runtime provider is still required; implying every provider is supported |
| Evidence First | Principle/label; use `evidence-first` as an adjective | Proof first; legal proof; evidence-complete when fields are missing |

The current public metadata also uses `Operational Trust Infrastructure`. Treat that phrase as a current implementation term requiring a controlled-glossary decision; do not casually alternate it with `Enterprise Trust Infrastructure` within one journey.

Trademark symbols are required in polished buyer-facing prose on first prominent use where the design permits. Omit symbols from code identifiers, URLs, APIs, event names and repeated technical references.

## State language

Use explicit, observable states:

- `Real ML`
- `Provider-backed detection`
- `Heuristic baseline`
- `Awaiting credentials`
- `Awaiting data`
- `Not implemented`
- `Not recorded`
- `Test Mode`
- `Calibration incomplete - insufficient reviewed ground truth.`
- `Ready`, `Caution`, `Blocked` only when their governing checks are defined

Do not substitute `Live`, `Connected`, `Verified`, `Passed`, `Accurate`, `Complete` or `Production ready` unless current evidence supports the exact claim. Configuration is not health; an API key is not a completed integration; a generated report is not proof of report completeness.

## Outcome writing pattern

Every operational summary should answer:

1. What state is the workflow in?
2. What changed or was decided?
3. What evidence supports it?
4. What evidence is missing?
5. Who owns the next action or final authority?
6. Where can the reader inspect Replay or the Trust Report?

Example:

> Provider-backed verification completed. Two evidence references are recorded. Policy approval is awaiting reviewer action. The reviewer remains the final authority. Open Replay for the decision chronology.

Avoid:

> Our AI proved the interaction was safe and automatically approved it.

## Audience calibration

| Audience | Lead with | Then provide |
| --- | --- | --- |
| Executive buyer | Outcome, operational exposure, accountability | Evidence boundary, deployment path and unresolved conditions |
| Security and identity | Control plane, authorization, provider state | Evidence lineage, denial behaviour, threat and integration boundaries |
| Risk and compliance | Policy evaluation, reviewer authority, retention | Report/export evidence and explicit coverage limitations |
| Enterprise architect | Boundaries, data flows, adapters, failure modes | Integration contract and replaceability |
| Operator/reviewer | Current state and next action | Evidence, Replay, owner and escalation history |
| Investor | Category, adoption proof and operating discipline | Evidence-backed readiness without invented traction |

## CTA and navigation language

Use one primary buyer action and one supporting action per decision point. Prefer the shared actions `Request Demo`, `Request Controlled Pilot`, `Book Pilot`, `Contact Enterprise`, `Buyer Documentation` and `Pilot Checklist` where they match the page purpose. Do not create synonyms that imply separate programs or competing workflows.

Links name the destination or outcome (`Open Replay`, `Review Trust Report`) rather than `Learn more`. Access-controlled links should signal authentication or administrator requirements before navigation when that fact would change the user's choice.

## Prohibited claims

Do not claim legal proof, guaranteed compliance, perfect detection, zero risk, autonomous approval, universal provider support, immutable evidence, production readiness, connected provider health, calibrated accuracy, precision/recall or enterprise adoption without current reviewed evidence. Never describe simulated, seed or demonstration data as live customer activity.

## Content review checklist

- Approved term and capitalization used consistently.
- State matches current evidence and environment.
- Human authority is explicit.
- Missing evidence and blocked dependencies remain visible.
- CTA reuses the canonical buyer journey.
- No internal tooling, tenant data, secrets or unsupported metrics are exposed.
- Link label, destination and access boundary agree.
- Heading, list and error text remain understandable to assistive technology.
