# AI Agent Tracking and Decision Flow

Cyber Sentinels tracks AI-agent activity as governed workflow evidence. It does not claim that ML autonomously decides trust.

## How Tracking Works

1. Agent discovered.
2. Human owner identified.
3. Delegated authority checked.
4. Permission scope reviewed.
5. Action intent captured.
6. Runtime, session and provenance signals evaluated.
7. Trust posture updated.
8. Decision made: allow, review, escalate, block or insufficient evidence.
9. Replay event written.
10. Evidence preserved.
11. Governance review opened when needed.

## What ML Does

ML and provider signals can contribute evidence when implemented and validated. Current flow labels sources explicitly as Provider API, Heuristic Baseline, Runtime Intelligence, Real ML, Demo Data, Awaiting Credentials or Not Implemented.

## What ML Does Not Do

- It does not silently approve or block actions.
- It does not prove authenticity by itself.
- It does not replace accountable human review.
- It does not create benchmark claims without labelled validation data.

## When Blocking Happens

Blocking occurs when authority is missing, permission scope is mismatched, intent risk is critical, runtime anomalies are severe, prior governance state is blocked, or evidence is insufficient for safe continuation under policy.

Blocking preserves evidence, writes audit history, creates replay context and does not silently delete source data.

## When Human Review Happens

Human review happens when signals are mixed, permission scope is overbroad, intent risk is medium, provenance is incomplete, provider credentials are awaiting configuration, or runtime context changes.

## Evidence Preserved

- Agent identity and owner.
- Declared intent.
- Permission scope.
- Runtime and session signals.
- Provenance confidence.
- Detection and trust-score source labels.
- Decision reason.
- Governance action.
- Final outcome.

## How Replay Proves The Decision

Replay keeps the agent, human owner, declared intent, permission scope, evidence chain, detection source, trust-score source, runtime signals, decision, allow/block/escalate reason, governance action and final outcome in one reconstructable record.

## Production ML Maturity Requirements

Production ML maturity requires labelled validation data, active provider/model evidence, source-specific precision/recall/F1, human-reviewed false positives and false negatives, enterprise pilot validation and benchmarked proprietary model-assisted detection.
