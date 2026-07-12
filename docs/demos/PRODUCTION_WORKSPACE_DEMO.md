# Production Workspace Demo

Purpose: demonstrate the protected production workspace without presenting configured, simulated or unavailable capability as live.

## Preparation

- Use an email-verified enterprise user; use a verified allowlisted admin only for provider/platform-health steps.
- Choose one existing workspace and a test agent action with an explicit authority record.
- Record which providers are `Live`, `Configured`, `Simulated`, `Awaiting Credentials` or `Unavailable` before the demo.
- Never quote precision/recall unless the screen shows dataset version, sample count, ground-truth method, benchmark version and review threshold.

## Flow

1. Sign in. Confirm protected routing and visible logout. **Live:** Supabase session only when the configured environment completes it.
2. Open Overview. The shell restores organization/workspace context; absent entity, investigation or correlation fields say so. **Live/configured:** derived authenticated context, not a persisted universal tenant claim.
3. Review current posture, material risks and required actions. **Live:** retained records; empty state means no visible record, not no risk.
4. Open the existing trust-execution demo and submit an AI-agent action to authorization. **Simulated:** demo payload. **Live:** authorization logic and state transition code.
5. Explain the allow/review/block decision and source labels: `Real ML`, `Provider API`, `Heuristic Baseline`, `Runtime Intelligence`, or `Human Review`. **Unavailable/Insufficient Validation:** anything without reviewed evidence.
6. Show enforcement continuing, pausing for review or blocking. Authority failure pauses; it never fails open.
7. Open Replay and trace the lifecycle. A delayed write is labelled incomplete; preserved evidence is distinguished from a completed Replay.
8. Open Evidence Graph and link actor, authority, workflow, evidence, decision and outcome. Missing edges remain missing.
9. Open Trust Memory™ and show trust evolution only when a governed outcome is retained. A delayed update does not erase the source decision.
10. Open Governance. Confirm the named owner and next action for review/escalation.
11. As a verified admin, open Platform Health. Review application, auth, Trust Engine, Runtime Engine, Replay, Governance, Validation, provider, queue, database and deployment/build states. Each must read `Healthy`, `Degraded`, `Awaiting Configuration`, `Unavailable` or `Unknown` based on its actual check.

Close by running one degraded path: provider unavailable, awaiting credentials, authorization unavailable, Replay delayed, Trust Memory delayed, governance queue delayed, expired session, or insufficient/partial evidence. State what happened, whether execution continued or paused, whether evidence was preserved and the next operator action.
