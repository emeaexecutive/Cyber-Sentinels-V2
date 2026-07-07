# Trust Algorithm Automation and Execution Engine

## Why ML Alone Is Not Enough

ML is one signal. Cyber Sentinels works through Detection Signals, Trust Algorithm, Decision Engine, Workflow Automation, Governance and Replay. Provider or model output can inform the workflow, but it does not create autonomous certainty or replace accountable human review.

## Trust Algorithm Inputs

The trust algorithm accepts identity confidence, proof-of-human result, agent identity, NHI ownership, session integrity, injection risk, device/channel integrity, provenance confidence, document risk, intent risk, runtime behavior, provider signals, heuristic baseline, previous trust posture, governance history and reviewer outcomes.

Allowed source labels are:

- Real ML
- Provider API
- Heuristic Baseline
- Runtime Intelligence
- Governance Review
- Demo Data
- Awaiting Credentials
- Not Implemented

## Decision Model

Allowed decisions are `allow`, `step_up`, `review`, `escalate`, `block` and `insufficient evidence`.

Each result includes trust score, trust level, confidence band, decision, reasons, evidence references, source labels, limitations and next action. The algorithm must not return "confirmed fake" unless provider/model evidence and governance evidence support that conclusion.

## Workflow Execution Paths

- `allow`: create receipt, update trust posture through replay context, write replay event and continue workflow.
- `step_up`: require stronger verification, create a task-equivalent event and write replay context.
- `review`: create governance review, assign reviewer through governance metadata, preserve evidence and write replay event.
- `escalate`: create high-risk governance event, notify/admin queue placeholder, preserve evidence and write replay event.
- `block`: block actor/action/workflow access, preserve evidence, create audit log, create replay event, create receipt/report and avoid deleting evidence.
- `insufficient evidence`: pause workflow, request more evidence and write replay event.

## Tracking Events

Tracked events include actor detection, session start, provider signal receipt, trust score change, step-up requirement, workflow allowed, workflow paused, workflow escalated, actor blocked, governance review created, reviewer decision recorded, receipt generated and replay event written.

Every event includes actor ID, actor type, workflow ID, decision, source, evidence references and created timestamp.

## Replay Integration

Every algorithm and workflow action should write replay data. Replay must show detection signal, trust algorithm result, decision, action executed, evidence, governance status and final outcome.

Replay should answer:

- What happened?
- Why did trust change?
- What did Cyber Sentinels do?
- Who or what approved?
- What was blocked or allowed?

## Block And Allow Logic

Allow continues the workflow only when evidence supports it under policy. Block stops execution while preserving evidence, audit history, replay context and receipts. No block path silently deletes evidence.

## Trust Authentication Model

Trust authentication checks authenticated user, verified human, verified agent, authorized NHI, active session integrity, permission scope, trust posture threshold, step-up requirement and governance lock.

Outputs are access allowed, step-up required, governance required, blocked, reason and whether a replay event is required.

## Remaining Production Gaps

- Labelled validation datasets for production workflows.
- Reviewed provider/model evidence before production detection claims.
- Precision, recall and F1 from approved benchmark cases.
- Human-reviewed false-positive and false-negative loops.
- Durable queue integrations for reviewer assignment and notifications.
- Enterprise pilot evidence for automated execution paths.
- Proprietary model-assisted detection benchmarks before any first-party ML claim.
