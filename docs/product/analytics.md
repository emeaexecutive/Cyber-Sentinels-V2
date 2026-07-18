# Enterprise analytics

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Current state

Product analytics is not active. No analytics SDK, provider, root instrumentation component or consent controller was identified. The Cookies page describes analytics as a placeholder, and the reserved events in `docs/epic-16/SPRINT_16_1B_1_ANALYTICS.md` are not emitted.

Operational trust events, audit logs, verification records and enterprise-access submissions exist for product operation and security. They are not a substitute for consented product analytics and must not be copied into an analytics platform by default.

## Measurement principles

- Measure customer outcomes and journey completion, not employee surveillance or indiscriminate clicks.
- Collect the minimum data needed to answer a declared product question.
- Keep tenant, person, evidence and provider secrets out of analytics payloads.
- Obtain and persist consent before optional analytics begins.
- Keep security/audit processing and optional product analytics as separate purposes, stores and retention policies.
- Analytics failure must never block verification, Replay, governance, report export or access control.
- Test Mode and demonstration events must be separable from production usage.
- Event names and properties require an owner, schema version, retention period and validation test.

## Event catalogue

The following is the required future measurement contract. All events are `Not implemented` until an approved provider, consent design and data-protection review are complete.

| Outcome | Proposed event | Trigger | Allowed properties | Prohibited properties |
| --- | --- | --- | --- | --- |
| Demo Requests | `demo_request_submitted` | Server confirms a valid demo request | source route, campaign category, outcome, environment | name, email, free text, IP address |
| Pilot Requests | `pilot_request_submitted` | Server confirms a valid controlled-pilot request | source route, organisation-size band, outcome, environment | contact details, requirements text, evidence |
| Enterprise Access | `enterprise_access_requested` | Access request is durably accepted | source route, request type, outcome, environment | identity fields, company name, message |
| Verification Events | `verification_completed` | Verification reaches a terminal result | verification class, terminal state, duration band, environment | subject identity, evidence content, model/provider payload |
| Replay Usage | `replay_opened` | Authorized user opens a Replay record | entry route, role category, environment, demo/live mode | replay ID, decision content, evidence references |
| Dashboard Usage | `dashboard_viewed` | Authorized dashboard view completes | role category, surface, load-time band, environment | user ID, tenant name, counts that expose business activity |
| Trust Report Downloads | `trust_report_downloaded` | Authorized export succeeds | format, report type, role category, environment, demo/live mode | report reference, report body, subject or reviewer identity |

Stable anonymous/session identifiers should be omitted unless a reviewed measurement question cannot be answered without them. If introduced, they require purpose limitation, short retention and consent withdrawal handling.

## Funnel definitions

| Funnel | Start | Completion | Quality signal |
| --- | --- | --- | --- |
| Enterprise evaluation | Enterprise or buyer-documentation view | Demo, pilot or enterprise-access request confirmed | Request is valid and routed, not merely clicked |
| Pilot adoption | Pilot documentation viewed | Controlled-pilot request confirmed | Request reaches an accountable owner |
| Operational verification | Dashboard/workspace verification initiated | Terminal verification state | Duration and outcome category without evidence payload |
| Trust review | Replay or transparency view | Report successfully exported or governance action completed | Authorized completion with mode declared |

## Consent and privacy controls

Before activation, implement a consent manager that defaults optional analytics off, records consent version and time, supports withdrawal, prevents pre-consent transmission, and exposes a current Cookies explanation. Honour applicable browser/privacy signals where required by policy. Data processing, residency, subprocessors, deletion and retention must be approved before provider selection.

Never send personal contact data, authentication identifiers, access tokens, tenant names, workflow IDs, verification content, evidence, Replay references, policy text, prompts, provider responses, support screenshots, IP addresses or free text in analytics events.

## Validation and ownership

Analytics activation requires:

1. product owner and privacy/security owner approval;
2. versioned event schema and data dictionary;
3. consent and withdrawal tests;
4. development/test/production separation;
5. duplicate and retry handling;
6. payload allowlist tests and network inspection;
7. retention/deletion verification;
8. dashboard definitions that distinguish requests from completed outcomes; and
9. a kill switch that does not affect core product operation.

Until these controls exist, the correct dashboard state is `Not implemented`, not zero usage.
