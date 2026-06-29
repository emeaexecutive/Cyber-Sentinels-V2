# Enterprise Trust Control Plane

## Control Plane Philosophy

The Cyber Sentinels Enterprise Trust Control Plane is an operational command
layer for configuring explainable trust policy and accountable governance
routing.

It coordinates:

- workflow trust thresholds;
- provider-backed verification evidence;
- session integrity requirements;
- trust assurance levels;
- reviewer queues and ownership;
- trust decay timing;
- replay retention;
- governance escalation.

The control plane routes work. It does not accuse a person, determine truth or
apply an automatic punitive decision.

## Security Boundary

The control-plane page and APIs require verified administrative access through
the existing admin authorization helper. Middleware also classifies
`/enterprise/control-plane` as an administrative route.

This foundation:

- does not weaken authentication;
- does not change RLS;
- does not introduce public policy mutation;
- does not create a surveillance data stream;
- does not persist drafts without an approved schema and RLS design.

The current interface supports local policy-draft preview. API endpoints expose
admin-protected templates, validation and evaluation. Durable publishing is
intentionally deferred until an enterprise policy schema and access model are
approved.

## Operational Trust Policy

Each policy defines:

- workflow type;
- assurance level;
- escalation threshold;
- high-assurance threshold;
- provider confidence minimum;
- session integrity minimum;
- trust decay timing;
- replay retention period;
- provider trust weighting;
- reviewer queue;
- assigned reviewer;
- session anomaly handling;
- mandatory human approval.

Initial policy templates cover:

- high-risk candidate workflows;
- executive verification requirements;
- session integrity enforcement;
- high-assurance workflow approval;
- provider confidence minimums.

Provider confidence is evidence context, not a final verdict. An anomaly is
review context, not an accusation.

## Escalation Logic

`lib/policy-engine.ts` evaluates deterministic threshold crossings. A workflow
can be routed to:

- continue with oversight;
- governance review;
- high-assurance review;
- hold for human decision.

“Hold for human decision” is not a rejection or punishment. It prevents a
sensitive workflow from advancing without an accountable reviewer.

Every trigger records:

- policy identifier;
- trigger code;
- configured threshold;
- observed value;
- plain-language explanation;
- evidence references.

The engine never returns an autonomous accusation or a claim of biometric
certainty.

## Governance Routing

Every evaluation retains:

- reviewer queue;
- assigned reviewer;
- workflow review ownership;
- human-review requirement;
- policy explanation;
- replay context.

The governance-routing API exposes the same ownership model. Evaluation calls
produce append-only audit events through the existing audit helper. Reviewer
actions remain authoritative for final workflow outcomes.

## Governance Continuity

Governance continuity means that escalation, reassignment, evidence requests
and resolution remain connected to the workflow chronology.

The routing result includes:

- the policy that triggered;
- why escalation occurred;
- threshold observations;
- evidence references;
- required reviewer resolution.

These fields can be retained in audit metadata and reconstructed by replay.

## Replay Continuity

Replay remains canonical operational evidence.

The Trust Replay surface now looks for replay-linked policy metadata and shows:

- which policy triggered;
- why escalation occurred;
- which threshold changed trust state;
- what governance action resolved the workflow.

If no policy audit exists in the selected replay window, the interface says so.
It does not infer or fabricate a policy decision.

Policy evaluation audit context uses:

- `policy_id`;
- `policy_name`;
- `policy_route`;
- trigger codes, thresholds and observations;
- replay context;
- human-review requirement;
- explicit `automatic_punitive_decision: false`.

## Provider Trust Weighting

Provider weighting expresses how much different evidence categories contribute
to policy context. Initial categories are identity, session, provenance and
device evidence.

Weights must total 100. They do not assert provider accuracy and do not convert
provider confidence into truth. Failed, missing or unstable provider evidence
routes the workflow for review according to policy.

## Trust Decay

Trust decay is an evidence-freshness rule. When the latest evidence is older
than the configured number of days, the engine requests review or refreshed
evidence.

It is not behavioral surveillance and does not lower a person’s reputation.
The rule only describes whether the retained workflow evidence remains current
for a declared operational purpose.

## API Foundations

The initial admin-protected endpoints are:

- `GET /api/policies` — policy templates and engine boundary;
- `POST /api/policies` — policy evaluation and replay-ready audit context;
- `GET /api/governance/routing` — reviewer queues and ownership;
- `POST /api/governance/routing` — explainable governance routing;
- `GET /api/trust/thresholds` — configured threshold summaries;
- `POST /api/trust/thresholds` — validate a threshold draft.

Threshold drafts are preview-only. The response explicitly states that
publishing requires approved storage and RLS policy.

## Explainability Principles

Every control-plane result must answer:

1. Which policy applied?
2. Which configured threshold was crossed?
3. What value was observed?
4. Why does the threshold matter?
5. Which evidence references contributed?
6. Which queue and reviewer own the next action?
7. What must be recorded in replay?

Missing evidence stays visible. Human reviewers can disagree with a route,
request more evidence or record a bounded continuation.

## Non-Goals

This foundation does not provide:

- surveillance;
- automatic accusations;
- autonomous punitive decisions;
- perfect identity certainty;
- guaranteed fraud detection;
- a proprietary truth model;
- silent policy publishing;
- a replacement for accountable enterprise governance.
