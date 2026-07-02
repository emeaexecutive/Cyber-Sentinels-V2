# Production Candidate Finalization

Date: 2 July 2026

## Finalized operational areas

The production candidate presents one connected operational path:

1. homepage and enterprise surfaces explain Operational Trust;
2. authentication protects user, workflow, governance, and admin surfaces;
3. recruiter, candidate, and Session Integrity workflows record reviewable
   evidence;
4. Trust Posture combines identity, Session Integrity, Authorization Lineage,
   Governance Review, Evidence Chain continuity, and risk signals;
5. Governance Review retains named ownership and human action;
6. Replay Timeline reconstructs chronology and the final operational outcome;
7. Verification Receipt preserves the portable evidence summary; and
8. admin tooling validates provider, workflow, enforcement, and deployment
   readiness without exposing credentials.

Legacy concept routes remain functional for compatibility but are absent from
primary navigation and use canonical Operational Trust language when reached.
Synthetic Counterpart and Origin DNA are not primary navigation concepts.

## Provider status handling

Every operator-facing provider and ATS integration is normalized to:

- `Live`: a supported code path is enabled and the required configuration has
  passed its explicit readiness gate;
- `Simulated`: controlled fixture data is being used;
- `Awaiting Credentials`: required server-side configuration is absent or the
  integration has only partial inbound configuration; and
- `Disabled`: the provider is not enabled for operational evidence.

Internal adapter details remain available in notes and capability fields.
Credential values are never displayed. `Live` does not claim provider uptime,
accuracy, successful verification, or independent assurance.

## Replay philosophy

Replay Timeline is the clearest reconstruction surface in the platform. It
answers:

- what happened and when;
- what changed in Trust Posture;
- which provider, session, and workflow evidence existed;
- why Governance Review intervened;
- who reviewed the workflow;
- how Authorization Lineage changed; and
- what final operational outcome was recorded.

Replay is read-only and reconstructs retained records only. It does not infer
missing evidence, provider success, or reviewer decisions.

## Governance continuity

- Governance queues remain authenticated and workspace/admin constrained.
- Reviewer assignment, escalation, evidence requests, approval, rejection, and
  explained/false-positive resolution remain explicit human actions.
- Fake-actor enforcement routes require admin API access and preserve evidence
  across blocking, removal, false-positive, reporting, and escalation actions.
- Support screenshots require authenticated consent, accepted image types, a
  5 MB limit, private storage, and short-lived signed admin review URLs.
- The validation lab remains admin protected and labels controlled scenarios as
  Simulated rather than model or provider benchmarks.

## Responsive and navigation review

Source-level review confirms:

- primary navigation wraps on narrow screens;
- dropdown width is bounded to the viewport and closes on navigation, outside
  pointer interaction, or Escape;
- login uses a single-column layout before the large breakpoint;
- Replay Timeline, Trust Center, and Verification Receipt cards collapse to
  single-column layouts and use wrapping action groups; and
- print-only receipt behavior remains isolated from interactive controls.

The in-app browser automation control surface was unavailable during this pass,
so live viewport screenshots and interaction playback remain a manual validation
requirement rather than a claimed result.

## Known limitations

- Environment-variable presence cannot prove provider uptime, credential
  validity, webhook delivery, or provider accuracy.
- A receipt records workflow evidence; it is not legal proof or universal
  identity certainty.
- Replay completeness depends on upstream retention of timestamps, evidence
  references, reviewer ownership, and authorization changes.
- Rule-based scores prioritize review and do not constitute trained detection.
- Legacy URLs remain available for compatibility even though their historical
  names are no longer primary product language.

## Remaining validation requirements

- Verify deployed Supabase RLS, private storage policies, migrations, and
  database constraints against the production project.
- Exercise email verification, password reset, redirect allowlists, and all
  access levels in the production domain.
- Exercise each provider with controlled valid, invalid, timeout, and revoked
  credential cases.
- Complete a real mobile browser walkthrough for navigation, login, Replay
  Timeline, Trust Center, Governance Review, and Verification Receipt.
- Upload and review a consented support screenshot in the target storage bucket.
- Run fake-actor enforcement and Governance Review actions against seeded
  production-like tenant data before pilot onboarding.
