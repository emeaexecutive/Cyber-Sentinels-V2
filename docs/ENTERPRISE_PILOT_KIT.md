# Enterprise Pilot Kit

Cyber Sentinels pilot onboarding is designed for controlled enterprise walkthroughs. The kit keeps the product focused on operational trust: hiring security, session integrity, governance review, replay evidence and verification receipts.

## Onboarding Flow

1. Start at `/pilot/welcome` to explain what Cyber Sentinels protects.
2. Continue to `/pilot/getting-started` for the pilot checklist, FAQ and support flow.
3. Use `/demo` before showing live records so stakeholders understand the narrative.
4. Create an isolated workspace through `/enterprise/pilot-setup` when a real pilot is approved.
5. Upload evidence, inspect flags and open governance review before presenting outcomes.
6. Open replay and export the verification receipt as the pilot artifact.

The onboarding flow should stay simple. A pilot operator should be able to explain the product in terms of evidence, review, receipt and replay without introducing new infrastructure or speculative systems.

## Demo Flow

Use the demo routes as guided enterprise walkthroughs:

- `/demo`: overview of the enterprise trust problem and the two guided walkthroughs.
- `/demo/hiring-attack`: synthetic applicant, injection-risk signal, governance escalation, human review, receipt and replay.
- `/demo/session-integrity`: identity verified at entry, session context changes later, reviewer owns the action and the receipt preserves the outcome.

The demo narrative should avoid hype. It should not claim automatic authenticity, liveness-only trust or AI-made decisions. The message is operational: identity is one signal; session integrity, evidence and governance determine what happens next.

## Governance Review

Governance review is the accountable human layer. It is used when a workflow has unresolved risk, missing evidence, session anomalies or a decision that requires a named reviewer.

Pilot operators should be able to show:

- pending governance actions;
- recent reviewer actions;
- escalation history;
- supporting evidence;
- receipt and replay references;
- unresolved risk that still needs review.

The lightweight `/admin/pilot-overview` page gives admins a pilot-facing snapshot of active pilots, recent reviews, pending governance actions, flagged sessions and generated verification receipts.

## Replay Workflow

Replay is the operational memory of the pilot. It reconstructs the workflow without rewriting history.

A pilot replay should answer:

- What evidence existed?
- Which flags or session events appeared?
- Which governance actions were opened or resolved?
- Which reviewer action was recorded?
- Which verification receipt was generated?

Use `/trust-replay` for the replay explorer and `/replay/[id]` for a specific workflow reconstruction.

## Verification Receipt Export

Verification receipts should be printable, exportable and enterprise-readable. The receipt should summarize:

- subject and workflow context;
- identity and session integrity state;
- deepfake and injection risk state when available;
- governance review outcome;
- evidence summary;
- audit references;
- replay link.

Use the existing Print / Save PDF control for pilot artifacts. A receipt is evidence for review, not an automatic trust decision.

## Support Model

Pilot support should stay tied to operational evidence.

When a participant needs help, collect:

- route and workspace;
- subject, receipt or replay link;
- expected result;
- actual result;
- whether governance review is pending;
- whether the issue blocks the walkthrough.

Use `/help` for general support and `/enterprise-access` for pilot-team contact routing. In-app notifications remain the source of record when email delivery is not configured.

## Pilot Assumptions

- Supabase is required for auth, database, storage and operational records.
- Turnstile, Hopae, World ID, Stripe, OpenAI and email delivery are optional unless a specific pilot depends on them.
- Pilot data should be sample-only unless a customer-specific workspace is approved.
- Human governance remains authoritative.
- AI may assist with summaries only when configured; it does not decide trust.
- Receipts and replay timelines are operational evidence, not black-box scoring.
- Admins should check `/admin/runtime-validation`, `/admin/deployment-readiness` and `/admin/pilot-overview` before live walkthroughs.

## Live Walkthrough Checklist

Before a live walkthrough:

- Confirm runtime validation is READY or CAUTION with only expected optional-provider warnings.
- Confirm admin access works.
- Confirm `/demo`, `/demo/hiring-attack` and `/demo/session-integrity` render.
- Confirm a replay route and receipt route are available for the chosen sample.
- Confirm the operator knows which governance action is pending or resolved.
- Confirm support routing is understood.

The pilot is ready when the enterprise can understand what happened, what evidence exists, who reviewed it and how the workflow can be replayed.