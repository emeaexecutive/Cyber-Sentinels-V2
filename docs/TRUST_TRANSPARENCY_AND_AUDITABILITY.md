# Trust Transparency and Auditability

## Transparency Philosophy

Cyber Sentinels is designed to help enterprises understand, review and defend
operational trust decisions.

Transparency means that every available trust decision can answer:

- what changed;
- why trust shifted;
- which evidence contributed;
- which provider signals were involved;
- which governance actions occurred;
- who owned the escalation;
- how the workflow was resolved;
- where replay preserves the chronology.

If a record is absent, the platform says it is absent. It does not infer a
reviewer, evidence item, provider result or policy decision.

## Why Cyber Sentinels Avoids Black-Box Certainty

Trust is not reduced to a single unexplained score.

The current workflow-trust model is deterministic and uses reviewable inputs:

- identity and provider evidence;
- session integrity;
- evidence completeness;
- governance review state;
- authorization lineage;
- replay continuity;
- workflow anomalies.

Its output is operational posture and routing context. It is not:

- truth detection;
- biometric certainty;
- guaranteed authenticity;
- guaranteed fraud prevention;
- an autonomous accusation;
- a replacement for accountable human review.

The scoring method and boundary are exposed in the Trust Transparency Center
and `/api/trust/explain`.

## Explainable Trust Decisions

`lib/trust-transparency.ts` normalizes existing workflow records into a
versioned transparency report.

Each report includes:

- workflow reference and subject type;
- current posture;
- scoring method;
- latest recorded change;
- trust-shift rationale;
- evidence references;
- provider attribution and state;
- governance intervention history;
- reviewer and escalation ownership when recorded;
- resolution summaries;
- replay reference;
- authorization lineage;
- receipt and continuity counts;
- explicit limitations.

The report does not recalculate or overwrite source evidence. It explains the
records returned through the existing authenticated workflow-trust loader and
RLS context.

## Replay Auditability

Replay is canonical operational audit evidence.

Replay preserves:

- evidence chain;
- workflow chronology;
- reviewer actions;
- escalation path;
- policy triggers when retained in audit metadata;
- authorization lineage;
- trust posture transitions;
- provider evidence summaries;
- receipts and governance history.

The replay API now includes a dedicated explainability envelope with:

- what changed;
- why trust shifted;
- evidence references;
- reviewer actions;
- escalation path;
- policy and authorization lineage;
- provider signals.

Replay summaries remain secondary to source evidence. The platform does not
rewrite historical records to make a chronology appear complete.

## Governance Continuity

Governance defensibility depends on visible ownership and resolution.

Governance views and APIs should expose:

- action status;
- assigned reviewer or owner;
- workflow reference;
- evidence reference;
- creation and resolution time;
- resolution notes;
- replay reconstruction reference.

When reviewer attribution is not stored, the output states “Reviewer not
assigned” or “Reviewer not recorded.” It does not fabricate a name.

Human review remains authoritative for sensitive outcomes.

## Evidence Defensibility

Evidence defensibility means preserving:

- source attribution;
- provider identity;
- provider verification state;
- evidence references;
- chronology references;
- governance context;
- receipt references;
- known gaps.

Provider output is evidence, not final truth. A configured provider is not
proof of provider health or accuracy.

Evidence continuity counts describe available records. They do not prove that
every source is accurate or complete.

## Audit Reporting

The Trust Transparency and Enterprise Auditability surfaces provide:

- trust decision reports;
- governance summaries;
- replay summaries;
- workflow audit trails;
- provider evidence summaries;
- printable browser reports;
- authenticated JSON exports;
- authenticated plain-text exports.

Exports are assembled from currently accessible records. They include a
boundary statement and use private, no-store response headers.

PDF signing, immutable external storage and certification are not claimed.
Browser “Print / Save PDF” remains a user-controlled rendering option.

## API Transparency

The transparency API foundation includes:

- `GET /api/trust/explain?workflow_id=...`
- `GET /api/audit/summary?workflow_id=...`
- `GET /api/audit/export?workflow_id=...&format=json`
- `GET /api/audit/export?workflow_id=...&format=text`
- refined `GET /api/replay/[id]`
- refined `GET /api/governance/events`
- refined `GET /api/trust/posture`

All routes use existing authenticated access and RLS-backed clients. They do
not use a service-role bypass.

Outputs include replay references, governance continuity and provider evidence
summaries where source records exist.

## Enterprise Surfaces

### Trust Transparency Center

`/trust/transparency` is available to authenticated users and explains a
specific accessible workflow or subject.

It shows:

- scoring inputs and output meaning;
- trust-state explanation;
- provider evidence;
- governance intervention history;
- evidence references;
- authorization lineage;
- replay and export actions.

### Enterprise Auditability

`/enterprise/auditability` requires verified administrative access.

It shows:

- authorized audit-event counts;
- governance action counts;
- replay session counts;
- evidence-chain counts;
- workflow-specific audit report;
- governance defensibility records;
- recent audit history.

The route is included in middleware’s administrative protection list and uses
the existing admin-page access helper.

## Operational Boundaries

This layer:

- does not add surveillance monitoring;
- does not weaken authentication;
- does not weaken RLS;
- does not create opaque scoring;
- does not invent missing evidence;
- does not claim regulatory certification;
- does not autonomously approve or reject people;
- does not claim perfect identity or media certainty.

It makes existing operational evidence easier to inspect, replay and defend.
