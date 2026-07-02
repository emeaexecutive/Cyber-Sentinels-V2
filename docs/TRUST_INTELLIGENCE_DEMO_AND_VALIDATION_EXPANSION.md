# Trust Intelligence Demo and Validation Expansion

Date: 2 July 2026

## Scope

This pass expands the existing Trust Evaluation Lab and demo Replay Timeline
without adding another trust engine, protected data model or primary navigation
item. The demonstration layer evaluates operational trust across humans, AI
agents, workflows, evidence chains, authorization events and governance actions.

## Evaluation scenarios

Reusable scenarios are defined in `lib/trustEvaluationScenarios.ts`:

| Scenario | Example type | Maturity | Provider state |
| --- | --- | --- | --- |
| Executive Impersonation | Synthetic identity | Concept | Awaiting Credentials |
| Proxy Candidate Interview | Provider-backed evidence | Simulated | Simulated |
| Injected Session Workflow | Workflow anomaly | Prototype | Disabled |
| AI Agent Authorization Drift | Governance escalation | Prototype | Disabled |
| Provenance Conflict Event | Replay divergence | Placeholder | Awaiting Credentials |

Every scenario records:

- the evaluation question;
- initial and final Trust Posture;
- evidence-continuity summary;
- provider state;
- explicit limitation;
- event chronology;
- governance intervention;
- reviewer attribution;
- Authorization Lineage; and
- final operational state.

These are controlled examples. Their maturity labels describe the source and
development stage of the example, not detection quality or enterprise readiness.

## Replay alignment

The existing `/replay/demo` route accepts an allowlisted scenario identifier,
for example:

`/replay/demo?scenario=ai-agent-authorization-drift`

Unknown identifiers fall back to the Proxy Candidate Interview scenario. No
arbitrary query content is rendered.

The replay now explains:

- what happened;
- why Trust Posture changed;
- what evidence existed at that moment;
- what governance action occurred;
- who reviewed the event;
- how authorization changed; and
- the final operational outcome.

Scenario links all reuse this existing replay route. Live replay lookup and its
authentication boundary remain unchanged. The demo Verification Receipt is
linked only from the Proxy Candidate Interview because that receipt represents
the hiring demonstration; other scenarios return to the Trust Evaluation Lab.

## Governance explainability

Governance queue cards retain the existing protected workflow and now use
clearer operator labels:

- `Escalation explanation` shows the recorded explanation or policy context.
- `Reviewer attribution` names the assigned reviewer reference.
- `Trust-state transition` connects review opening to the current action state.

Existing evidence summary, escalation chain, next-step, continuity effect,
false-positive resolution and replay links remain in place. Human reviewers
remain authoritative.

## Simulated versus live distinctions

- `Simulated` means a controlled fixture, not a provider result.
- `Concept` means an evaluation design that has not established performance.
- `Prototype` means implemented workflow behavior under controlled conditions.
- `Placeholder` means interface and chronology validation without provider
  evidence.
- Provider states remain explicit: Simulated, Awaiting Credentials or Disabled.
- No scenario claims accuracy, biometric certainty, fraud detection, deepfake
  detection, model safety or independent validation.

## Navigation

No primary navigation item was added. The existing subtle `Trust Lab` entry
remains inside the Platform dropdown.

## Remaining validation gaps

- Run scenarios against representative, consented pilot data.
- Define datasets, expected outcomes and reviewer protocols before publishing
  benchmark results.
- Validate provider integrations with real credentials and documented failure
  behavior before marking evidence Live.
- Measure reviewer agreement and false-positive handling under a controlled
  study design.
- Confirm authorization-drift policies against enterprise-specific authority
  models.
- Validate replay and receipt continuity with seeded tenant records and deployed
  authentication.
