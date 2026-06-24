# Launch Checklist

Cyber Sentinels launch readiness should stay focused on enterprise confidence,
demo clarity, pilot onboarding and operational trust positioning. Do not add
new infrastructure, APIs or tables unless a confirmed runtime error requires it.

## Core Readiness

- Homepage ready: Confirm the homepage keeps the clearest message and avoids abstract or speculative claims.
- Demo ready: `/demo`, `/demo/hiring-attack` and `/demo/session-integrity` show the fake-candidate flow, session integrity failure, governance escalation, replay evidence and receipt issuance.
- Replay ready: Replay surfaces show chronology, flags, reviewer actions, trust state changes and evidence references.
- Receipts ready: Verification receipts are printable, enterprise-safe and show trust state, reviewer action, chronology, replay reference and verification evidence.
- Governance ready: Governance language stays human-governed, reviewable and audit-oriented.
- Auth verified: Login, logout, protected routes and email verification should be checked before every pilot demo.
- Admin verified: `/admin`, `/back-office` and admin-only tools must require admin access and must not render public data to unauthenticated users.
- RLS verified: RLS must remain enabled and authorization must use server-controlled app metadata or admin allowlists, never user-editable metadata.
- Supabase Preview passing: Confirm migrations apply in Supabase Preview before live pilot conversations.
- Runtime validation clean: Missing Supabase URL, missing anon key, broken database connection and admin auth failure remain blockers.
- Optional integrations status: Stripe, Hopae, OpenAI, World ID and Turnstile should be warnings only when absent, not public-app blockers.

## Demo Checklist

- Start at `/demo`.
- Open `/demo/hiring-attack`.
- Show the sequence:
  1. Fake candidate enters workflow.
  2. Verification begins.
  3. Session integrity fails.
  4. Governance review opens.
  5. Replay evidence appears.
  6. Reviewer action is recorded.
  7. Verification receipt is issued.
- Open `/demo/session-integrity` when the audience asks why verification alone is insufficient.
- Explain that signals inform human review and do not decide candidate trust.

## Pilot Onboarding Checklist

- Confirm one target workflow.
- Confirm one pilot owner.
- Confirm one reviewer role.
- Confirm which evidence is expected.
- Confirm which outcome should produce a receipt.
- Confirm how a replay will be reviewed after the walkthrough.

## Launch CTAs

Use only these primary CTAs:

- View Demo
- Request Enterprise Access
- Become a Design Partner
- Book Intro Call

## Known Deferred Items

- Full compliance dashboard.
- Broad provider orchestration beyond current abstractions.
- New database tables for speculative workflows.
- New APIs for unvalidated pilot needs.
- Public positioning around perfect detection, AI authority or automatic trust decisions.
- Deep investor data room materials beyond the founder demo script and launch checklist.
