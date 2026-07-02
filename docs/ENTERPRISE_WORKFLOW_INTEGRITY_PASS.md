# Enterprise Workflow Integrity Pass

Date: 2 July 2026

## Workflow improvements

The existing hiring workflow now presents a clearer operational sequence:

1. Recruiter evidence is recorded as pending or requiring Governance Review.
2. Candidate Verification records identity and workflow context without
   self-declaring a verified outcome.
3. Session Integrity keeps liveness, injection risk, deepfake risk,
   device/channel integrity, and manual review separate.
4. Governance Review assigns a human owner, evaluates linked evidence, and
   records an outcome or requests more evidence.
5. The Replay Timeline reconstructs chronology and Trust Posture changes.
6. The Verification Receipt preserves the reviewed operational outcome and its
   Evidence Chain.

Recruiter intake can no longer submit `verified` or `risk_detected` as if an
intake field were a completed decision. The API independently enforces the same
fail-closed status boundary as the UI.

## Replay continuity

Replay remains the canonical, read-only chronology. Existing replay views join:

- timestamped workflow events;
- Trust Posture transitions;
- provider evidence summaries;
- Session Integrity flags;
- Governance Review actions and reviewer attribution;
- Authorization Lineage;
- Evidence Chain and Verification Receipt references; and
- the final recorded operational state.

State styling now distinguishes restricted, rejected, failed, pending, review,
and successfully recorded states instead of presenting every non-pending state
as healthy.

## Governance handling

- Reviewer assignment remains explicit and human-owned.
- Related-record links now route interview sessions, candidate workflows, and
  recruiter workflows to existing relevant surfaces.
- Replay links are rendered only when a subject reference exists.
- Review actions use operational labels and specific reviewer notes.
- False positives and explained exceptions use the existing `resolved` state,
  with an explicit human-review note. No new status, table, or automated
  decision path was introduced.
- Empty states explain what creates a queue item and preserve the boundary that
  recommendations support, but do not replace, Governance Review.

## Trust Posture consistency

Numeric summaries are labelled as an `Operational trust indicator`, paired with
an explainable review label and described as evidence coverage rather than
certainty. Individual factor values are labelled as evidence strength. These
numbers prioritize review and expose contributing context; they do not approve,
reject, or authenticate a person.

Trust Posture continues to combine operational context, governance state,
provider evidence, session changes, evidence freshness, and replay continuity.

## Session Integrity clarity

The session workflow now explains each signal before evidence is recorded:

- liveness concerns presence challenge completion;
- injection risk concerns substituted capture sources;
- deepfake risk concerns media-risk indicators;
- device/channel integrity concerns capture-path and metadata continuity; and
- manual review is the named human decision step for incomplete or conflicting
  evidence.

No signal is presented as a final authenticity verdict.

## Enterprise navigation

Recruiter, candidate, and session verification surfaces now expose direct next
steps into the connected workflow. Existing Trust Posture, Governance Review,
Replay Timeline, Session Integrity, Evidence Chain, and Verification Receipt
surfaces remain the authoritative destinations; no duplicate navigation system
or route was added.

## Remaining operational gaps

- Provider configuration does not prove uptime, credential validity, or
  verification accuracy; live provider exercises remain deployment-specific.
- Deployed Supabase RLS, storage policy, and database constraints require
  target-environment validation.
- Replay completeness depends on upstream workflows retaining timestamps,
  evidence references, reviewer ownership, and authorization changes.
- Recruiter domain consistency is workflow evidence, not proof of employment or
  organizational authority.
- False-positive closure is recorded in reviewer notes under the existing
  resolved state; structured false-positive analytics would require an approved
  schema change and is outside this pass.
- A production browser walkthrough should still validate signed-in redirects,
  mobile layout, empty states, and provider-backed workflows with real tenant
  data.
