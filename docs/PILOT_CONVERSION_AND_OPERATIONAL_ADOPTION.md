# Pilot Conversion and Operational Adoption

## Pilot philosophy

Cyber Sentinels pilots should prove operational value through one named
workflow, one accountable review path and one replay-backed outcome. A pilot is
not a broad security benchmark and does not claim perfect detection.

The first walkthrough should answer:

- what started the workflow;
- how trust changed;
- which evidence contributed;
- when governance intervened;
- how replay reconstructs the chronology;
- what the final receipt records.

Pilot templates are code/config foundations. They use existing workspaces,
cases, governance actions, timeline events, replay sessions and receipts. No new
database table or column is introduced.

## Onboarding workflows

Five operational templates are available:

1. **Hiring security** — candidate context, provider verification, interview
   continuity and reviewer outcome.
2. **Executive approval** — requester identity, approval scope, authorization
   lineage and decision rationale.
3. **Enterprise onboarding** — organization context, workspace ownership,
   provider evidence and access review.
4. **Session integrity** — verified entry, device/channel changes, integrity
   signals and analyst review.
5. **Governance escalation** — escalation reason, reviewer assignment, evidence
   requests and resolution.

Each template defines workflow start, trust evolution, replay chronology,
governance intervention, final outcome and expected evidence. Pilot Setup stores
the selected template in existing metadata and chronology fields.

## Design-partner onboarding

Before activation, the design partner and Cyber Sentinels should agree:

- the single workflow in scope;
- named workflow and governance owners;
- the evidence boundary and permitted sample data;
- provider status and known failure modes;
- the escalation path;
- replay and receipt review participants;
- success measures and support ownership.

The public design-partner and enterprise-access pages explain these expectations
and supported workflows. Protected setup creates the isolated workspace, first
case, pending governance action and replay path.

## Trust continuity model

Trust continuity is maintained when the same workflow subject has:

- recorded timeline activity;
- replay reconstruction;
- a verification receipt.

This measure indicates linked operational records. It does not measure security
effectiveness, detection accuracy or absence of fraud.

## Replay philosophy

Replay is the strongest pilot proof surface because it keeps provider evidence,
session changes, governance action, workflow transition and receipt issuance in
one chronology.

Replay must remain source-led:

- no invented trust-score movement;
- no manufactured replay URL;
- no unsupported immutability claim;
- no simulated event presented as provider-backed evidence.

Receipt pages link to replay only when an actual replay session exists.

## Governance model

Human review remains authoritative. Pilot templates open or describe review
paths but do not automate final approval. Governance records should retain:

- escalation reason;
- assigned reviewer;
- evidence request or rationale;
- status and resolution notes;
- workflow subject;
- timestamps;
- replay and receipt continuity.

## Measurable operational value

The protected pilot overview reports five counts derived from recorded data:

- **Workflows reviewed** — unique workflow subjects with completed governance
  or a generated receipt.
- **Escalations triggered** — recorded escalated cases, governance actions or
  escalation timeline events.
- **Trust continuity maintained** — workflow subjects linked across timeline,
  replay and receipt records.
- **Replay reconstructions completed** — persisted replay sessions.
- **Provider-backed verifications completed** — receipts with a named,
  normalized provider signal in verified state.

These are activity and continuity metrics. They are not threat-prevention,
accuracy, return-on-investment or risk-reduction claims.

## Operational trust reporting

The verification receipt is the executive-readable pilot artifact. It should
show workflow identity, evidence summary, provider state, governance outcome,
reviewer attribution, receipt status and an actual replay reference where
available.

Receipts remain printable and audit-friendly, but they are not blockchain
records, cryptographic proof or automatic trust decisions.

## Adoption sequence

1. Confirm pilot scope and owners.
2. Select an operational template.
3. Create the isolated pilot workspace and first case.
4. Attach permitted evidence.
5. Observe trust and session changes.
6. Complete governance review.
7. Reconstruct replay.
8. Generate and review the receipt.
9. Review operational metrics and limitations with stakeholders.
10. Decide whether to continue, adjust or stop the pilot.

## Ethical and product boundaries

- No surveillance or hidden behavioral capture.
- No speculative autonomous authority.
- No fake provider or detection claims.
- No weakening of authentication or RLS.
- No public display of customer operational metrics.
- No persistence expansion without a separate schema proposal.

