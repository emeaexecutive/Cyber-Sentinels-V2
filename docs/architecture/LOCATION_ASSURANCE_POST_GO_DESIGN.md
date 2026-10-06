# Location Assurance: Post-GO Architecture Design

**Status:** Design proposal only. This document does not authorize implementation in the current release candidate. Do not deploy location collection, continuous GPS, fingerprinting, or provider integrations as part of the current NO-GO release.

## 1. Capability Definition

Location Assurance evaluates whether an actor's operating context is consistent with the action, authority, policy, device, operator, workload and available evidence at decision time. It is not a geolocation product, fraud verdict, surveillance feature, or proof of physical presence.

**IP geolocation is evidence, not truth.** A VPN, proxy or Tor signal is also evidence, not a fraud conclusion. Cyber Sentinels should correlate qualified, purpose-bound signals and let tenant policy determine whether the result permits, reviews or denies a consequential action.

## 2. Threat Model

Design for inaccurate or stale IP databases; shared NAT, corporate VPN and cloud egress; commercial VPN, proxy and Tor exit changes; spoofed client locale/timezone; stolen or shared devices; remote desktop and session handoff; impossible-travel false positives; workload relocation; compromised agent runtimes; provider outages; replayed/forged callbacks; conflicting evidence; and an attacker attempting to learn which signals trigger policy.

Do not assume that a trusted IP proves a trusted operator, that a verified identity proves the same person is currently operating, or that a corporate device proves the authorized employee is present. Avoid revealing provider thresholds or precise location to unauthorized tenants or users.

## 3. Provider-Neutral Evidence Model

Represent observations as immutable evidence references, not a single `location_score`:

- Subject and scope: tenant, human/device/agent/workload reference, and optional workflow/transaction.
- Provenance: provider, adapter/version, evidence class, observation time, ingestion time, verification method, and source reference.
- Network: coarse country/region, ASN, network owner/ISP, hosting/datacenter classification, and separate VPN/proxy/Tor indicators with provider confidence when supplied.
- Device/session: pseudonymous device reference, attestation result and freshness, browser/OS context, timezone/locale claims, remote-session indicators, and continuity references.
- Workload: declared and observed cloud provider/region, runtime identity, deployment/build digest, TEE/workload attestation, and continuity reference.
- Mobility: optional consent/legal-basis-bound device location evidence, normally reduced to coarse region before persistence.
- Integrity: signed provider payload reference or digest, evidence expiry, contradictions, quality/coverage limits, and stable reason codes.

Providers may return only a subset. Missing signals remain UNKNOWN; they are not negative evidence. Client-submitted values remain asserted and cannot be upgraded to server-verified evidence by naming a provider.

A provider adapter should accept a scoped subject and minimal request context, return normalized observations plus provenance/limitations, and never return an authorization decision. Adapter configuration must include health, qualification state, rate/cost limits, retention class, region and shutdown behavior.

## 4. Assurance States

Use qualitative, explainable states: `UNKNOWN`, `LOW`, `MODERATE`, `HIGH`, and `CONFLICTED`. `DEVICE_ATTESTED` is a separate evidence attribute, not a rank above HIGH. Keep provider confidence as provider-supplied metadata with calibration/coverage caveats; do not invent a universal probability or aggregate score.

Each assessment records the evidence references, source, timestamps, subject, expiry, conflicts, reason codes and the policy requirements considered. Assessments are decision-time snapshots, not mutable current truth.

## 5. VPN, Proxy and Tor Semantics

Record VPN/proxy/Tor and datacenter signals independently from geolocation. An approved corporate VPN with consistent device/operator/workload evidence may satisfy policy. A commercial VPN with otherwise consistent evidence may be REVIEW or ALLOW depending on action policy. Tor, new device, conflicting region, failed operator continuity and a privileged action may produce DENY when that tenant's policy requires it.

Provider outage or unknown classification is not equivalent to VPN detected. No global `VPN detected = DENY` rule is permitted.

## 6. Device, Human and Operator Continuity

Model separate links:

`Human identity ↔ operator session ↔ device ↔ operating context/location ↔ authority`

A strong identity proof is not proof of current operation. Device continuity can support identity continuity but cannot replace step-up or human confirmation where policy requires it. Preserve the source and time of each link and represent uncertainty explicitly.

## 7. Autonomous Agent and Workload Continuity

For AI agents, compare declared organization, deployment, cloud provider/region, ASN, runtime, build and attestation with observed signed runtime evidence. A new region or provider is a material change, not automatic fraud. Re-evaluate the exact requested action against current authority and policy; missing or changed runtime evidence may cause REVIEW or DENY according to configured policy.

The control plane must distinguish signed first-party declarations from independently measured workload attestation. Neither a declaration nor a heartbeat proves downstream tool execution.

## 8. Policy Model

Location requirements belong in versioned tenant policy, not global code. Policy inputs may specify approved country/region sets, assurance state requirements, device attestation, operator continuity, contradiction handling, freshness, provider minimum qualification, and behavior on missing/unavailable evidence.

Illustrative rules:

- High-risk financial action: require configured assurance threshold, trusted device evidence and operator continuity; unresolved contradiction routes to REVIEW or DENY per policy.
- Data export: require an approved processing region and current evidence.
- Admin privilege change: require an approved corporate context or explicit governed REVIEW.
- Agent tool execution: require an observed workload region in the permitted deployment set and current runtime binding.

Policy evaluation must identify the exact failed requirement and preserve the original snapshot. Location signals cannot create or expand authority.

## 9. Receipt, Replay and Trust Memory

A future canonical Receipt may reference claimed context, network-derived coarse region, device/workload evidence, anonymity signals, operator continuity, conflicts, policy requirement and decision reason. Prefer an evidence reference/digest and coarse region over raw IP, coordinates or device fingerprint.

Replay must reproduce what was known at the original decision time, including evidence freshness and contradictions. Later provider changes, revocation or movement must not overwrite historical context.

Trust Memory may append material context transitions such as `NEW_LOCATION`, `LOCATION_CONFLICT`, `DEVICE_CHANGED`, `OPERATOR_CONTINUITY_FAILED`, `WORKLOAD_REGION_CHANGED`, `ASSURANCE_EXPIRED` and `LOCATION_REVIEW_RESOLVED`. Memory remains evidence-linked and append-only; it does not infer intent or silently update the original decision.

## 10. Trust Operations Location View

A future restricted operations view may map coarse operating regions and time-bounded events for humans, agents, devices and workloads. Markers may include verified context, new region, VPN/proxy/Tor, impossible-travel candidate, unexpected cloud region, device/operator change, ALLOW/REVIEW/DENY and revocation.

Selecting an event opens its Receipt, Replay, relevant evidence, authority and policy explanation. Default precision is country/region, not coordinates. Do not display a continuous movement trail or use the map for employee productivity monitoring.

## 11. Privacy and Data Retention

Use purpose limitation, tenant isolation, role-based visibility, consent/legal-basis hooks, evidence expiry, auditability, redaction and configurable retention. Minimize at ingestion: discard raw IP when a coarse region/provider result suffices; avoid retaining precise coordinates or full device fingerprints by default; separate subject references from provider payloads; restrict raw payload access; and log administrative access. Do not make continuous GPS collection a default or prerequisite.

## 12. Future API Surface

Prefer authenticated provider-ingestion boundaries and existing canonical V1 decisions over a caller-facing endpoint that accepts trusted location claims.

Potential APIs, after design/security review:

- Provider callback/ingestion endpoint for signed normalized observations, scoped to an installation and tenant.
- Internal server API to resolve current operating-context evidence for a subject and policy.
- Read-only, tenant-scoped operating-context projection for authorized Trust Operations users.
- Existing `POST /api/v1/trust/decisions` consumes server-resolved evidence; the caller cannot supply assurance state, location verdict or authority.
- Existing Receipt/Replay routes expose only policy-authorized minimized historical projections.

Any public assertion endpoint must classify input as asserted, never server-verified, and must not become a decision bypass.

## 13. Future Data Model

First evaluate reuse of `evidence_objects`, Trust Signal Provider records, Operational Entity runtime observations and canonical decision snapshots. If a dedicated relation is justified, make it tenant-scoped and append-only, with subject/workflow references, provider/version, coarse normalized facts, source evidence reference/digest, observed/ingested/expiry timestamps, qualification state and reason codes. Add indexes only for scoped lookups and define retention/deletion of raw provider payloads separately.

Version any decision-time operating-context snapshot. Add RLS, service-only write paths, tenant-bound foreign keys, immutability tests and explicit migration/rollback review before implementation. Do not add a parallel authority, policy, decision, Replay or Trust Memory system.

## 14. Provider Categories

Potential providers include IP geolocation/ASN/network ownership, VPN/proxy/Tor/datacenter intelligence, device attestation and device-management systems, browser/session risk, optional mobile/GPS evidence, remote-access/session detection, cloud workload inventory, region/runtime attestation and TEE/workload identity. Qualify each source for coverage, precision, false-positive behavior, update cadence, data residency, retention, cost and outage semantics before representing it as active.

## 15. Staged Implementation Path

1. Product/legal review, privacy impact assessment, abuse cases, retention, threat model and policy semantics.
2. Evidence contract and provider qualification harness using synthetic fixtures only; no decision authority.
3. One bounded provider adapter with provenance, expiry, redaction and negative tests.
4. Server-side correlation into qualitative assurance states, preserving contradictions and UNKNOWN.
5. Canonical decision snapshot, policy reasons, Receipt/Replay and Trust Memory integration with change-after-decision tests.
6. Private coarse-region Trust Operations view with tenant/role tests and no continuous tracking.
7. Limited customer pilot with measured false-positive/false-negative review and explicit rollback/retention plan.
8. Broaden providers or contexts only after evidence quality and customer value are demonstrated.

## 16. Standalone Product Assessment

A provider-neutral Location Assurance evidence API could eventually be commercially useful to enterprises that already buy multiple network/device/workload feeds and need a portable evidence contract. It is premature as a separate product today: provider coverage, calibration, legal basis and customer demand are not yet proven, and a standalone API risks duplicating the existing provider/evidence layer.

If reconsidered after pilots, keep it an evidence-normalization service only. It must not own the Authority Graph, policy engine, ALLOW/REVIEW/DENY, execution, or canonical Replay. Cyber Sentinels Core remains the consequential decision authority.

## 17. Architecture Evolution

A post-GO evolution may extend the canonical sequence:

`Identity → Continuity → Device/Workload → Operator → Location/Environment Assurance → Authority → Policy → Runtime Trust Signals → Decision → Execution → Outcome → Receipt → Replay → Trust Memory`

Implement only the smallest evidence and snapshot additions needed by validated workflows. The sequence is a design direction, not a mandate to refactor the current release architecture or introduce a standalone product now.
