# Enterprise Trust Centre™

## Purpose

The Enterprise Trust Centre at `/trust-centre` is the authenticated operating
workspace for enterprise security, identity, risk and compliance teams. It is a
read-and-operate layer over the existing Enterprise Trust Architecture and
Continuous Trust Runtime. It does not create another trust score, event log,
policy store or state machine.

## Architecture

The server-rendered page resolves the authenticated user's first accessible
`trust_workspaces` tenant and role. A bounded read model then composes, in
parallel:

- `subject_trust_state` for current authoritative state and score;
- `evidence_objects` and the evidence graph for evidence and relationships;
- `continuous_trust_assessments` and `trust_drift_findings` for recalculation
  and drift context;
- `trust_events` and Trust Memory for Replay;
- `trust_policy_versions` and simulations for governed policy;
- `provider_health_snapshots` for provider operations; and
- `trust_alerts` plus immutable `trust_alert_activity` for operations.

Every service-role query is behind authenticated enterprise resolution and
includes an `enterprise_id` predicate. Browser requests include
`X-Enterprise-Id`; the API verifies membership independently. Responses are
private and `no-store`. The initial render and 30-second visibility-aware
refresh avoid loading waterfalls.

The repository uses the established root `app/` router, so the requested
`src/app/(enterprise)/trust-centre/` is implemented at the equivalent project
location `app/(enterprise)/trust-centre/`.

## Navigation

The Trust OS sidebar and command palette expose **Trust Centre**. Within the
Centre, keyboard-operable tabs provide:

1. Overview
2. Trust Graph
3. Trust DNA
4. Replay
5. Continuous Trust
6. Alerts
7. Policies
8. Providers
9. Reports

The global search field searches tenant-scoped subjects, AI agents and devices,
graph relationships, evidence descriptors, canonical events and policies.
Emails, phone numbers and document payloads are not selected or returned.

## Widgets

### Overview

Shows measured trust health, numeric score bands, high-risk entities, pending
reviews, open alerts, verification queue, manual-review projection, AI-agent
status, Replay activity, policy count, provider count and organisation scope.
No-data states use “Awaiting data” or an explicit unavailable message.

### Trust Graph

Loads the existing bounded graph API for the selected subject. Clicking a node
shows its type, domain, creation history and metadata after the canonical
sensitive-key filter has removed payload, credential, biometric, document,
email, phone, address and IP fields.

### Trust DNA

Displays an explainable operational projection of canonical evidence by
dimension, with score, confidence, weight, trend, evidence count, explanation
and historical comparison. This projection is not an authorization authority.
An absent dimension remains unscored instead of receiving a synthetic default.

### Replay

Filters immutable canonical events by text and provider. Audit mode shows
sequence and event hash. Replay, risk, evidence, drift and policy report exports
are generated from the same tenant read model.

### Continuous Trust

Shows live state, score, confidence, evidence freshness, recent signals,
material transitions, next evaluation and automatic recalculation history.

### Alerts

Supports open, acknowledged, investigating, resolved and dismissed states.
Analysts may comment; investigators may triage; administrators may assign.
Bulk actions are limited to 100 alert IDs. Resolution and dismissal require a
note. The service-only RPC validates tenant, transition, assignee membership and
terminal states, then writes immutable activity and architecture audit records.
It cannot mutate `subject_trust_state`.

### Policies

Shows applicable immutable versions, status, domain, trigger count from retained
assessments and latest decision time. Administrators can submit an existing
hash-addressed simulation mode. Simulation results declare and enforce zero
production mutation.

### Providers

Shows latest measured state, latency, circuit availability, failure rate and
last successful observation. Confidence or health history that is not present
in the canonical provider snapshot remains “Not measured”.

### Reports

The following reports are available as JSON, CSV and PDF:

- Trust Summary
- Risk Summary
- Evidence Report
- Replay Report
- Trust Drift Report
- Policy Report

Exports are generated on demand, include tenant scope and generation time, set
`nosniff`, and are never publicly cacheable.

## Permissions

Trust Centre roles are capability profiles over existing workspace RLS roles:

| Trust Centre profile | Workspace authority | Capabilities |
| --- | --- | --- |
| Viewer | `observer` | Read, search, export |
| Analyst | `reviewer` plus administrator-set `app_metadata.trust_centre_role=ANALYST` | Viewer + comments |
| Investigator | `reviewer` (default reviewer profile) | Analyst + alert triage |
| Administrator | `admin` | Investigator + assignment and simulation |
| Super Administrator | workspace `owner` | Administrator capabilities |

Only trusted server-managed `app_metadata` can narrow a reviewer to Analyst.
Client-submitted role claims are ignored. Existing database roles and RLS
policies remain the authorization source.

## API usage

All endpoints require a Supabase session and an accessible enterprise header:

```http
GET /api/trust-centre/overview?limit=100
X-Enterprise-Id: 89f81d3b-0000-4000-8000-000000000000
```

```http
GET /api/trust-centre/search?q=agent-42&limit=20
X-Enterprise-Id: 89f81d3b-0000-4000-8000-000000000000
```

```http
GET /api/trust-centre/reports?report=trust-drift&format=pdf
X-Enterprise-Id: 89f81d3b-0000-4000-8000-000000000000
```

```http
POST /api/trust-centre/alerts/bulk
Content-Type: application/json
X-Enterprise-Id: 89f81d3b-0000-4000-8000-000000000000

{
  "alertIds": ["324d5b51-0000-4000-8000-000000000000"],
  "action": "resolved",
  "note": "Evidence reviewed and remediation confirmed."
}
```

Mutations enforce same-origin JSON requests, a 64 KB request ceiling,
capability checks and the service-only audited RPC.

## Performance and accessibility

- Initial queries run concurrently and are bounded to 100 records by default.
- API limits cap overview at 200, search at 50, graph at 200 and bulk actions at
  100.
- Tabs lazy-render their content; search is debounced and abortable.
- Refresh pauses for hidden tabs and uses no-store data.
- No per-row database request is used in the overview.
- Native controls, visible focus rings, tab semantics, labels, live regions,
  textual state labels, table captions/headings and AA-oriented contrast support
  keyboard and screen-reader use.

## Security notes

- Middleware protects `/trust-centre`; API authorization is independent.
- Service-role access is server-only and always follows verified membership.
- Existing RLS is not disabled or bypassed for browser access.
- Graph metadata and search projections omit private evidence payloads.
- Append-only activity and architecture audit entries retain actor, action,
  target, correlation ID and timestamp.
- Policy simulation cannot update production trust state.
- Errors fail closed and do not return provider or database internals.
