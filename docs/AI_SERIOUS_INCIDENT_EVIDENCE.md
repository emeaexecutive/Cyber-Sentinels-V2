# AI Serious-Incident Evidence and Regulatory Reporting Lineage

## Product outcome and boundary

Cyber Sentinels converts fragmented AI-agent incident evidence into an immutable, regulator-ready operational record.

Preserve what happened, when the organization became aware, what containment was attempted, what evidence supported the reporting decision and what corrective action followed.

The workflow deliberately separates:

1. operational incident state;
2. potential regulatory relevance; and
3. an authorized reporting decision.

Operational screening is not legal advice or a legal conclusion. Cyber Sentinels does not determine liability, guarantee compliance, certify legal sufficiency, replace counsel, claim regulator approval, or automatically decide that an incident is reportable. `reporting_required`, `not_reportable`, `submitted`, and `resolved` require authorized human decisions and their evidence.

## Architecture audit and gap matrix

The audit found no implemented canonical `security_incidents` or equivalent serious-incident workflow. Incident references existed in operational documentation and generic governance copy, but not as a runtime model. Epic 27 therefore adds one tenant-bound assessment domain and reuses the existing Enterprise Trust Architecture rather than creating duplicate graphs, memory, replay, or authority engines.

| Capability | Existing runtime implementation | Database support | UI support | Reuse | Gap before Epic 27 |
| --- | --- | --- | --- | --- | --- |
| Serious-incident case | Absent | Absent | Documentation only | Trust Workspace and agent/system references | Implemented as canonical assessment root |
| Environment and scope evidence | Implemented by Epic 26 | Seven tenant-bound tables | Environment & Scope dashboard | Direct immutable references | Linked into incident snapshot and graph |
| Provider-neutral evidence | Implemented | Evidence objects and provider observations | Provider evidence surfaces | Attribution and integrity conventions | Extended with incident-specific classification |
| Containment lineage | Partial control-action primitives | No canonical incident containment table | Partial governance language | Enforcement evidence and incident chronology | Normalized requested-versus-confirmed event states |
| Evidence Graph | Implemented | Canonical nodes and edges | Evidence Graph surfaces | Same graph tables and tenant model | Extended node and relationship vocabulary |
| Authority Graph / lineage | Implemented as typed domain conventions | Generic authority/evidence references | Authority documentation | Typed relationships | Incident responsibility assignments and artifacts |
| Replay | Implemented | Canonical Replay and projections | Replay viewer | Classification and chronology conventions | Incident reporting projection with distinct layers |
| Trust Memory | Implemented | `trust_memory_index` | Trust Memory surfaces | Material event conventions | Incident material events and corrected attribution |
| Continuous Trust | Implemented | Canonical trust state | Trust runtime surfaces | Scope decision and evidence references | Incident events inform evidence without inventing penalties |
| Regulatory screening | Absent | Absent | Absent | Deterministic policy and reason-code style | Operational-only screening engine |
| Reviewer decisions | Partial generic governance | Generic governance tables | Governance queue | Enterprise roles and append-only review | Incident-specific assigned roles and supersession |
| Evidence package | Absent | Absent | Absent | Canonical hashing and evidence references | Versioned immutable machine/human exports |
| External submission | Absent | Absent | Absent | Audit and chronology conventions | Evidence-only records; no portal credentials or direct SEND |
| Corrective actions | Documentation only | Absent | Absent | Evidence, reviewer, Replay and memory references | Append-only completion and validation lineage |

## Assessment workflow

The case root preserves organization, incident, AI-system and agent identity; model and agent versions; deployment/runtime references; responsible humans and organizations; jurisdiction; framework reference; organizational role; incident category; independent classification fields; chronology clocks; impact summary; evidence completeness; and Trust Fabric references.

Supported workflow states are `draft`, `evidence_collection`, `technical_review`, `security_review`, `compliance_review`, `data_protection_review`, `legal_review`, `executive_review`, `potentially_reportable`, `not_reportable`, `reporting_required`, `submitted`, `additional_information_requested`, `corrective_action_open`, `resolved`, and `reopened`.

Automated logic may suggest `potentially_reportable`. It cannot set protected reporting or closure states. Every human decision records identity, assigned role, organizational authority, type, decision, rationale, evidence, unresolved issues, conditions, approval chain, timestamp, conflict declaration when supplied, and supersession.

## Responsibility and Authority Lineage

Incident roles can represent model and system providers, deployers, developers, owners, evaluation sponsors/operators, harness and infrastructure providers, runtime security, identity/access providers, affected parties, responders, specialist reviewers, advisers, regulator liaisons, and executive approvers.

Typed lineage does not assume that a model provider controlled the harness, execution environment, egress, identity, credentials, monitoring, containment, or customer infrastructure. Assignments are tenant-bound, append-only, and superseded rather than overwritten.

## Evidence at incident

The immutable snapshot records normalized references to system and agent identity; model and agent version; prompt/configuration digest; masked prompt reference; tools and connectors; authority grants; scope lease; declared, configured and observed environment; effective access; targets; credential-state classification; policy; monitoring health; findings; exceptions; responsible-human state; deployment approval; assurance baseline; containment readiness; and provider evidence.

It rejects fields for passwords, secrets, tokens, cookies, raw credentials, private keys, raw payloads, exploit payloads, and full prompts. Later evidence creates a new snapshot or corrected record linked through supersession. It never rewrites the incident-time baseline.

## Awareness and reporting clocks

Technical occurrence, provider observation, Cyber Sentinels ingestion, detection, first human review, organizational awareness, materiality, containment, reporting decision, package approval, submission, acknowledgement, recovery, closure, and follow-up are distinct facts. Timestamp and ordering confidence remain attached to chronology events when sources conflict.

A deadline is recorded only when supplied by an authorized reviewer, an approved policy, or an external source. Its rule source, rationale, timezone, uncertainty, and approval remain visible. Unknown deadlines remain `unknown`; the product does not invent legal clocks.

## Impact evidence

Normalized impact ranges from `no_confirmed_impact`, attempts, unauthorized access, confidentiality/integrity/availability and financial effects through fundamental-rights, human-control, third-party, critical-infrastructure and systemic-risk effects. Assessments preserve affected references, data classifications, organizations, user estimate, duration, geography, reversibility, persistence, confidence, limitations, independent confirmation and reviewer confirmation.

A provider alert, model-generated statement, suspected target, or failed containment request cannot by itself establish confirmed impact.

## Potential regulatory relevance

The deterministic engine accepts operational facts and returns `no_known_trigger`, `potential_trigger`, `multiple_potential_triggers`, `insufficient_information`, or `specialist_review_required`, with stable reason codes, missing evidence, and recommended reviewer roles.

Every result is labeled **OPERATIONAL SCREENING — NOT A LEGAL CONCLUSION**. The engine cannot set `reporting_required`, `not_reportable`, liability, compliance, or legal sufficiency.

## Reviewer authorization and supersession

Workspace access alone is insufficient to claim a specialist capacity. The actor must also have an active incident responsibility assignment matching the recorded reviewer role. Compliance, legal, data-protection, or executive authority is required for protected reporting/closure states; compliance, legal, or executive authority is required to approve packages. A later decision links to the decision it supersedes, preserving both.

## Packages and external submissions

Packages are versioned, data-minimized exports containing incident identity, operational baseline, environment/scope evidence, snapshot, chronology, findings, impact, containment, corrective actions, operational screening, reviewer decisions, uncertainty, evidence index/digests, Replay and Trust Memory references, schema version, export time, and a stable SHA-256 digest.

Approved packages are immutable. Changes create an exactly incremented superseding version. `regulator_ready` means internally prepared and approved; it does not mean legally sufficient. Exports exclude secrets and restricted raw evidence.

External submission records preserve destination, jurisdiction, channel, external reference, actor, time, exact package version/digest, acknowledgement, follow-up and limitations. An acknowledgement proves receipt only; it does not prove agreement with legal conclusions. No regulator-portal password, session token, cookie, or private API credential is stored. No direct EU SEND integration is claimed or implemented.

## Requested-versus-confirmed containment

Containment states distinguish recommended, approved, requested, provider acknowledged, attempted, provider confirmed, independently confirmed, partially effective, failed, contradicted, and unknown outcomes. Acknowledgement is not confirmation; provider confirmation is not independent confirmation. Outcome states require evidence, and independent confirmation requires an attributed independent source.

## Corrective actions and corrections

Corrective actions preserve owner, approver, dates, separate completion and validation evidence, residual risk, reviewer approval, effectiveness, linked evidence, and supersession. Completion cannot be inferred from a request or acknowledgement; validation requires its own evidence.

Corrections retain original and corrected record identifiers, reason, actor, evidence, time, approval where required, and the supersession chain. Historical package states remain reproducible. Corrected attribution produces a superseding Trust Memory event instead of leaving an unsupported permanent penalty.

## Evidence Graph, Replay, Trust Memory and Continuous Trust

Epic 27 extends the canonical Evidence Graph vocabulary; it does not create a second graph. It connects incidents, systems, snapshots, scope/environment evidence, trigger findings, reviewer decisions, packages, submissions, corrective actions, regulator responses, Replay and Trust Memory using neutral relationships where causation is uncertain.

Replay keeps **TECHNICAL EVIDENCE**, **PROVIDER ASSERTION**, **PROVIDER CONCLUSION**, **CYBER SENTINELS OPERATIONAL SCREENING**, **REVIEWER DECISION**, **LEGAL CONCLUSION**, **REGULATOR RESPONSE**, and **CORRECTIVE ACTION** separate. It does not imply an external action without evidence.

Trust Memory receives material, explainable incident events. Continuous Trust consumes linked evidence and canonical trust states; Epic 27 does not invent arbitrary permanent numeric penalties.

## Security and operations

All records carry `enterprise_id`, composite tenant-safe foreign keys, deny-by-default RLS, authenticated tenant reads, revoked direct client writes, append-only triggers, correlation IDs, uniqueness constraints, and server-only RPC writes. Browser mutations require JSON, CSRF checks, authentication, bounded streamed bodies, strict validation, and stable safe errors. Evidence bodies and reviewer rationale are not logged.

The migration is development-only and is not applied remotely by this change.
