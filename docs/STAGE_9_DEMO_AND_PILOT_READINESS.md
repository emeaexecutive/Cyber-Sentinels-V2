# Stage 9 Demo and Pilot Readiness

Date: 2026-06-24

## Summary

Cyber Sentinels is ready for focused demo calls and design partner conversations around one clear story: a fake candidate enters a hiring workflow, verification begins, Session Integrity fails, Governance Review opens, Replay Evidence appears, reviewer action is recorded and a Verification Receipt is issued.

No major infrastructure, new tables, speculative features, auth changes or RLS changes were added.

## 90-Second Demo Script

0:00-0:10 - Open `/demo`.

"Cyber Sentinels protects enterprise workflows against synthetic identity attacks. The fastest way to understand it is to watch one risky hiring workflow move from signal to proof."

0:10-0:25 - Open `/demo/hiring-attack`.

"A fake candidate enters the workflow with a convincing profile. Verification begins, but identity at entry is only one part of the story."

0:25-0:40 - Advance to Session Integrity failure.

"During the interview, the session changes. Channel and injection-risk evidence no longer match the verified context. Cyber Sentinels treats that as an Active Flag, not an automatic verdict."

0:40-0:55 - Advance to Governance Review.

"The workflow pauses and Governance Review opens. A reviewer gets the evidence, context and open action instead of a hidden score."

0:55-1:10 - Advance to Replay Evidence.

"Replay Evidence shows the chronology: verification, session change, flag, governance action and audit references in order."

1:10-1:25 - Advance to Verification Receipt.

"The reviewer action is recorded and a Verification Receipt is issued. Security, talent and compliance can inspect what changed, who reviewed it and where replay is available."

1:25-1:30 - Close.

"The future of AI is not only intelligence. It is trust."

## 5-Minute Founder Walkthrough

1. Start with the problem.

"Remote workflows now face synthetic candidates, proxy interviews, injected feeds and AI-assisted fraud. Existing security protects networks and devices. Cyber Sentinels keeps the trust record of the workflow itself."

2. Show `/demo`.

"This page is the controlled story. It is intentionally simple: fake candidate, verification, session integrity failure, governance review, replay evidence, reviewer action and receipt."

3. Open `/demo/hiring-attack`.

"Here is the hiring wedge. The product does not claim perfect detection. It shows the evidence and forces a reviewable workflow."

4. Open `/demo/session-integrity`.

"This is the core insight: verification can happen at entry, but trust can still change during the session. Session Integrity keeps liveness, injection risk, channel evidence and reviewer action separate."

5. Open replay or dashboard surfaces.

"Replay Evidence and Verification Chronology make the trust journey understandable. Operators can see timestamps, flags, evidence ordering and reviewer decisions."

6. Open a receipt route if demo data exists.

"The Verification Receipt is the portable artifact. It is printable, audit-ready and explains trust state, reviewer action and replay access."

7. Close with pilot path.

"For design partners, we start with one workflow, one review path and one receipt. The goal is not feature sprawl. The goal is proving whether this makes enterprise review clearer."

## Design Partner Pitch

Cyber Sentinels is looking for design partners with real review pressure in hiring security, session integrity or verification workflows.

The design partner promise:

- one focused pilot workflow
- clear Verification Evidence
- visible Governance Review
- replayable chronology
- printable Verification Receipt
- human-governed decisions

Good fit:

- security, talent, risk or compliance teams reviewing remote hiring or sensitive access workflows
- teams worried about fake applicants, proxy interviews, injected sessions or audit gaps
- teams that need evidence and reviewer actions to survive a real review meeting

Primary CTA:

- View Demo
- Request Enterprise Access
- Become a Design Partner
- Book Intro Call

## Pilot Readiness Checklist

- `/demo` clearly explains the proof workflow.
- `/demo/hiring-attack` shows fake candidate to receipt.
- `/demo/session-integrity` shows verification at entry and trust changing later.
- `/enterprise/pilot` explains pilot structure and outcomes.
- `/design-partner` explains who should participate and why.
- `/enterprise-access` supports Request Enterprise Access, Become a Design Partner and Book Intro Call language.
- Verification Receipts show trust state, reviewer action and replay link.
- Replay Evidence remains available through existing replay surfaces.
- Demo copy avoids surveillance framing, perfect detection claims and automated trust decisions.
- `npm run build` passes before commit.

## Runtime Safety

This stage did not change:

- auth
- RLS
- middleware
- database schema
- API routes
- admin access boundaries
