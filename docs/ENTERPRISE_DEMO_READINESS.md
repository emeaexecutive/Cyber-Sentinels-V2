# Enterprise Demo Readiness

## Pilot narrative

Organizations can no longer confidently verify who — or what — is entering critical workflows.

Cyber Sentinels demonstrates a practical response: verify identity, inspect session evidence, surface flags, route risk to human review, retain the audit trail, block the compromised workflow and issue a verification receipt that can be replayed later.

The demo uses synthetic sample data. It does not claim perfect detection, make automated hiring decisions or replace human review.

## 90-second demo flow

Start at /demo, then open /demo/hiring-attack.

1. **Synthetic candidate enters.** A sample applicant with incomplete provenance enters the hiring workflow.
2. **Verification is initiated.** A governed verification workflow is opened.
3. **Session checks are triggered.** Identity, liveness, media risk, injection risk and channel integrity remain separate states.
4. **Injection risk is detected.** An explainable flag is linked to retained session evidence.
5. **Governance review opens.** The workflow pauses and a human reviewer takes ownership.
6. **The audit trail is generated.** Timeline events and actor context preserve the sequence.
7. **Manual review escalates.** The reviewer examines identity, session and channel evidence.
8. **The threat is blocked.** The suspicious session is stopped without an automated candidate verdict.
9. **A receipt is issued.** The outcome, evidence, reviewer action and replay reference become portable.

The interface lets a presenter advance step by step or jump directly to any stage.

## Hiring security walkthrough

The hiring-security story should remain concrete:

- synthetic applicants can present convincing profiles;
- AI impersonation can separate appearance from the real participant;
- injected video feeds can change a session after identity verification;
- unsupported flags can create governance failures;
- evidence and human review protect the workflow from hidden automated judgments.

Use /demo/hiring-attack for the narrative and /demo-lab when a live seeded workflow is needed.

## Session integrity explanation

Open /demo/session-integrity.

Identity verification describes the entry state. Session integrity describes what happens after entry. Cyber Sentinels keeps identity, liveness, deepfake risk, injection risk, device-channel evidence and session anomalies separate so each can be reviewed and explained.

Identity verification is one signal. Cyber Sentinels adds session integrity, evidence, governance and human review.

## Replay workflow

/replay/[id] reconstructs the existing workflow record:

- verification chronology;
- session-integrity and injection-risk events;
- evidence history;
- governance actions;
- reviewer outcomes;
- receipts;
- audit references.

Replay is read-only. It explains what happened without changing history.

## Enterprise verification receipt

/verification/receipt/[id] presents a printable record containing:

- identity verification state;
- session integrity state;
- deepfake risk state;
- injection risk state;
- governance review outcome;
- evidence summary;
- timestamps;
- audit references;
- reviewer actions.

Use **Print / Save PDF** to create a portable pilot artifact.

## Governance flow

The demo must always preserve this boundary:

1. a signal is recorded;
2. evidence is linked;
3. a governance action is opened;
4. a human reviewer decides;
5. the outcome is audited;
6. replay and receipt explain the decision.

Signals do not automatically approve or reject candidates.

## Demo discovery

Demo links are available from:

- homepage;
- enterprise routes;
- hiring-security page through the enterprise navigation;
- founder control;
- enterprise-access page.

The primary conversion action is **Request Enterprise Access**. The secondary action is **View Demo**.

## Operator checklist

- Apply all current Supabase migrations.
- Keep ENABLE_DEMO_SEED=true only in local or private pilot environments.
- Confirm the demo routes load without authentication.
- Confirm the dashboard shows only the six pilot metrics.
- Seed a sample workflow before a data-backed walkthrough.
- Open replay and receipt from the seeded workflow.
- Check print preview before an enterprise meeting.
- Never use real applicant or customer data in demo mode.
