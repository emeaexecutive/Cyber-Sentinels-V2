# Enterprise dashboard

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Purpose and access

`/dashboard` is the authenticated operational overview. Supabase `getUser()` gates the page, while the root Enterprise Trust OS shell provides workspace navigation, global trust context, bounded platform status and command navigation. Dashboard data remains subject to RLS and source availability.

## Current dashboard model

The page executes eight parallel, count-only queries for flags, open governance reviews, session-integrity checks, receipts, retained decision events, evidence files, Replay sessions and unread notifications. It then presents an executive Decision Summary, eight linked metrics and a four-step pilot review path.

| Required area | Current implementation | Gap or boundary |
| --- | --- | --- |
| Overview | Decision Summary: posture, risks, recommended action, evidence, confidence and owner | Counts are an operational snapshot, not portfolio assurance |
| Trust Score | `Current Trust Posture` displays `Stable` or `Attention`; trust posture detail has its own route | No canonical numeric score is shown on the overview; this avoids false precision but differs from the brief label |
| Verification Queue | Active flags and open reviews link to interview risk/governance | No unified verification queue module is embedded; `/verification-queue` is admin-protected |
| Evidence Timeline | Evidence count, receipts and Replay path link outward | No embedded ordered evidence timeline on the overview |
| Replay | Recent decision count, Replay Activity and primary Replay Timeline action | Session count can be `Awaiting data`; completeness is not inferred |
| Trust Memory | Displays `Process-local` with a no-autonomous-learning boundary | No durable Trust Memory snapshot/version is summarized here |
| ORI Summary | Not present on `/dashboard` | ORI is off/shadow/advisory and post-decision; adding a summary requires mode/version/abstention truth |
| Provider Health | Registry readiness summary with link to `/admin/provider-status` | The hard-coded admin destination is unsuitable for non-admin users; shell status uses `/trust-center#providers` for them |
| Enterprise Alerts | Open reviews, active flags and unread notifications | Notification count is not a severity-ranked enterprise alert center |

## Workspace shell

The shell owns seven areas: Overview, Operations, Trust, Runtime, Governance, Providers and Administration. Non-admin and verified-admin destinations differ where required. It also owns:

- one global context bar with organization, workspace, workflow, entity, posture, authority, investigation and correlation fields;
- a seven-category platform status strip that preserves `Unknown`/degraded states;
- `Ctrl+K` command navigation to existing destinations; and
- separate desktop sidebar and mobile horizontal area navigation.

The derived global context is route-based unless a record-specific surface supplies stronger context; it must not be mistaken for a persisted current workflow selection.

## Design principles

### Executive friendly

Lead with current posture, risk, action, evidence, confidence and owner. Engineering diagnostics remain linked rather than expanded into the overview.

### Operationally actionable

Every attention state links to the owning workflow: flag review, Governance Review, Replay or Trust Posture. A metric without an owner or next action is incomplete.

### Explainable

Counts state their source meaning. `Awaiting data`, process-local and evidence-per-case boundaries remain visible. Provider or ORI signals do not become final decisions.

### Minimal cognitive load

The overview currently has two top actions, one decision summary, eight metric cards and one four-step path. New widgets should replace or consolidate an existing concept, not create another dashboard.

### Accessible

Use native links/buttons, visible focus, meaningful headings, semantic lists, 44px controls, reduced motion and non-color status text. Horizontal mobile navigation must retain keyboard reachability and visible focus.

## Status and empty states

- `Stable` means no counted flag/review, not verified enterprise-wide trust.
- `Attention` means a flag or review exists; severity must be resolved on the destination.
- `Awaiting data` means no retained measurement was available; it is not zero.
- “No active operational review items” is a valid empty state and must not be replaced by demo records.
- Provider `configured` and real healthy/Live states remain distinct.

## Performance and reliability

The overview's parallel head-count queries are bounded and avoid loading rows. Protected pages are force-dynamic, and a dashboard loading boundary provides an accessible skeleton. Gaps are durable query telemetry, per-query failure display, tenant-scoped query-plan evidence and a non-admin Provider Status destination.

## Recommendations

1. Keep `/dashboard` as the only enterprise overview.
2. Resolve the non-admin provider-status link without creating a new route.
3. Add ORI only when mode, version, confidence, abstention and post-decision boundary can be shown together.
4. Define a dashboard alert severity/ownership contract using existing notifications and governance records.
5. Preserve count-only parallel loading and measure deployed query latency before adding widgets.
