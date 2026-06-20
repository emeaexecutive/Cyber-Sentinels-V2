# Pilot Demo Readiness

## Enterprise demo outcome

The pilot demonstrates one focused operational story: Cyber Sentinels helps an enterprise review a hiring-session threat, preserve the evidence, record human governance, replay the chronology, and issue an enterprise-readable verification receipt.

The walkthrough uses synthetic sample data only. It does not claim production detection accuracy, automatically judge a candidate, or replace a human reviewer.

## Two-minute hiring security walkthrough

1. **00:00 — Synthetic candidate.** Open Demo Lab and seed the guided scenario. Maya Chen is clearly labelled as a synthetic demo candidate with partial identity verification.
2. **00:30 — Injection risk detected.** Open the hiring review and show the retained injection-risk signal. Explain that the workflow pauses instead of producing a candidate verdict.
3. **01:00 — Governance escalation.** Show the review assignment and evidence context routed to human governance.
4. **01:20 — Manual review.** Open the replay chronology. Point out the reviewer action, timestamp, evidence chain, and audit reference.
5. **01:40 — Threat blocked.** Show that the suspicious interview session was blocked after review. This is a session-security outcome, not a judgment about candidate trustworthiness.
6. **02:00 — Replay and receipt.** Open the verification replay and printable receipt. Confirm that evidence is retained and the decision path is explainable.

Demo entry point: `/demo-lab`  
Operational dashboard: `/dashboard`

## Verification replay

`/replay/[id]` is the enterprise replay view. It resolves an existing replay-session ID or interview-session ID and reconstructs:

- verification timeline;
- evidence chronology;
- session review history;
- integrity and injection-risk signals;
- governance actions and reviewer outcomes;
- verification receipts;
- matching audit references.

Replay is read-only. It explains what was known and what action was recorded without rewriting operational history. The broader `/trust-replay` explorer remains available for cross-workflow reconstruction and saved replay sessions.

## Governance workflow

The guided sequence is deliberately human-governed:

1. partial identity state is recorded;
2. a session-integrity risk signal is retained;
3. the workflow is escalated;
4. a reviewer inspects evidence;
5. the reviewer records the session block;
6. the action is preserved in timeline, audit, replay, and receipt views.

Cyber Sentinels does not auto-reject a candidate because a provider or risk signal passed or failed. Identity verification and integrity signals remain separate inputs to accountable review.

## Verification receipt

`/verification/receipt/[id]` presents the existing verification-receipt record in enterprise language. It shows:

- identity verification state;
- session integrity state;
- injection risk state;
- governance review outcome;
- evidence summary and retained chains;
- timestamps and reviewer actions;
- audit references;
- replay availability.

Use **Print / Save PDF** for a portable pilot artifact. The receipt is explainable operational evidence, not a blockchain record, automatic trust approval, or guarantee of authenticity.

## Demo operator checklist

- `ENABLE_DEMO_SEED=true` only in local or private pilot environments.
- Supabase service-role configuration is present server-side.
- The latest migrations have been applied.
- Demo Lab can seed and return direct replay and receipt links.
- `/dashboard` shows the six pilot operational categories without unrelated product clutter.
- The replay chronology and receipt load for the seeded workflow.
- Print preview produces a readable verification receipt.
- Reset or reseed before the next customer walkthrough when a clean state is required.

## Enterprise confidence cues

The replay and receipt surfaces explicitly show:

- verification completed;
- review completed;
- replay available;
- receipt generated;
- evidence retained.

These cues describe record availability and workflow completion. They do not convert a verification signal into a final Cyber Sentinels trust approval.
