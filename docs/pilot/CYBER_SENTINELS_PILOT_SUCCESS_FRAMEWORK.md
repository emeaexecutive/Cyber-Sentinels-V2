# Cyber Sentinels Pilot Success Framework

## Purpose

This document is the canonical pilot measurement specification. It defines the pilot metrics contract, the persisted data sources for each metric, and the evidence-backed status for each metric. It does not claim customer outcomes that are not measured.

## Measurement principles

Every metric must satisfy the following:

- it answers a specific business question;
- it is derived from persisted runtime or governance data;
- it has a clear numerator, denominator, and calculation window;
- it is classified as MEASURABLE NOW, PARTIAL, REQUIRES NEW EVENT DATA, or ROADMAP;
- it contributes to one of the three value categories: SAFER OPERATIONS, FASTER AUDIT / INVESTIGATION, or EASIER GOVERNANCE.

## Metric contract template

Each metric includes:

- metric name
- business question answered
- definition
- formula
- numerator
- denominator
- source tables/events
- tenant scope
- calculation window
- target
- current measurability state
- limitations

## Value categories

### 1. SAFER OPERATIONS

The pilot must quantify whether Cyber Sentinels reduces unsafe or unauthorized autonomous actions.

| Metric | Business question | Definition | Formula | Numerator | Denominator | Source | Tenant scope | Window | Target | State | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unauthorized ALLOW count | Did the system allow an unauthorized action? | Count of decisions with outcome ALLOW where the request was flagged as unauthorized or out of scope. | count(decisions where decision = ALLOW and unauthorized = true) | decisions with unauthorized = true and decision = ALLOW | all decisions in window | decision records, authority context, review records | enterprise-scoped | pilot window | 0 | MEASURABLE NOW | Requires the decision record to carry the unauthorized flag from the evaluation path. |
| Out-of-scope action rejection rate | Are invalid requests rejected before execution? | Percentage of known invalid action/resource/authority requests that return REVIEW or DENY instead of ALLOW. | rejected / known invalid requests | decisions with outOfScope = true and decision in {REVIEW, DENY} | decisions with outOfScope = true | decision records | enterprise-scoped | pilot window | 100% for controlled tests | MEASURABLE NOW | Depends on the test set or runtime labels for out-of-scope requests. |
| Authority revocation effectiveness | Are post-revocation attempts blocked? | Percentage of post-revocation attempts that are prevented from ALLOW. | prevented revocation attempts / revocation attempts | revocation records with prevented = true | revocation records | revocation events / decision linkage | enterprise-scoped | pilot window | 100% | MEASURABLE NOW | Requires the runtime to persist revocation attempts and the resulting decision linkage. |
| Credential abuse rejection rate | Does the system reject invalid or abused credentials? | Percentage of negative credential tests that are not accepted. | 1 - accepted negatives / total negative tests | negative tests with accepted = false | credential negative tests | credential-negative-test evidence | enterprise-scoped | pilot window | 100% of negative tests | MEASURABLE NOW | This is a controlled test metric, not a claim about all traffic. |
| Tenant isolation failures | Did cross-tenant access or leakage occur? | Count of cross-tenant control failures. | count(cross-tenant violations) | violations discovered in tenant-scoped tests or runtime | all tenant-scoped cases evaluated | security tests, runtime decision records | enterprise-scoped | pilot window | 0 | PARTIAL | Existing runtime models support tenant scoping; live cross-tenant violation evidence is still a controlled test artifact unless deployed telemetry is available. |
| Governed action coverage | Are pilot actions routed through Cyber Sentinels before execution? | Percentage of agreed pilot actions that passed through Cyber Sentinels. | governed decisions / pilot actions | decisions where governed = true | all pilot actions in scope | decision records | enterprise-scoped | pilot window | 100% of scoped workflow | MEASURABLE NOW | Only valid for the scoped pilot workflow, not all enterprise actions. |

### 2. FASTER AUDIT / INVESTIGATION

The pilot must prove that Cyber Sentinels reduces the effort required to answer who acted, what authority existed, why the outcome occurred, and what evidence was available.

| Metric | Business question | Definition | Formula | Numerator | Denominator | Source | Tenant scope | Window | Target | State | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Evidence coverage | Are consequential decisions complete enough to audit? | Percentage of decisions with transaction, decision, authority, policy, evidence, receipt, and Replay references present. | complete decisions / decisions | decisions with evidenceComplete = true | decisions in window | decision records, evidence records, replay / receipt references | enterprise-scoped | pilot window | 100% | MEASURABLE NOW | Requires the decision record to carry the evidence-completeness status. |
| Replay coverage | Can the pilot decision be reconstructed from persisted data? | Percentage of decisions with replay data available. | decisions with replayAvailable = true / decisions | decisions with replayAvailable = true | decisions in window | decision records, replay artifacts | enterprise-scoped | pilot window | 100% | MEASURABLE NOW | Depends on replay artifact availability for the exercised decisions. |
| Recovery coverage | Can a decision be retrieved from a new process or request? | Percentage of decisions retrievable from a new process/request. | decisions with recoveryAvailable = true / decisions | decisions with recoveryAvailable = true | decisions in window | decision records, recovery/replay linkage | enterprise-scoped | pilot window | 100% | MEASURABLE NOW | This is a runtime retrieval metric, not a claim about downstream systems. |
| Decision lineage completeness | Is the full authority and evidence chain present? | Percentage of decisions carrying actor, credential, delegator, authority, resource, action, policy, decision, reason, evidence, and timestamp. | complete lineage entries / decisions | decisions where the authority object contains all required fields and the decision record has the required references | decisions in window | decision records and authority records | enterprise-scoped | pilot window | 100% | PARTIAL | The current service uses a compact authority object; broader lineage completeness requires explicit field-level checks. |
| Time to reconstruct decision | How quickly can an operator reconstruct the reason and lineage? | Elapsed time from a transaction ID query to a complete explanation of who, what, why, authority, evidence, and outcome. | observed elapsed time | operator exercise results | operator exercise runs | pilot exercise log | enterprise-scoped | pilot exercise window | < 5 minutes | REQUIRES NEW EVENT DATA | This requires an executed operator exercise and a recorded start/end timestamp. |
| Incident investigation time | How quickly can an incident be understood? | Median time to identify cause, retrieve evidence, and reconstruct lineage in a controlled incident scenario. | observed elapsed time | incident exercise runs | incident exercise runs | incident exercise log | enterprise-scoped | pilot exercise window | to be set by pilot owner | REQUIRES NEW EVENT DATA | This is a future pilot exercise metric rather than a current runtime metric. |

### 3. EASIER GOVERNANCE

The pilot must prove that Cyber Sentinels reduces manual governance friction.

| Metric | Business question | Definition | Formula | Numerator | Denominator | Source | Tenant scope | Window | Target | State | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review rate | How often does the workflow require human review? | REVIEW decisions divided by total decisions. | review count / total decisions | review decisions | all decisions in window | decision records | enterprise-scoped | pilot window | diagnostic only | MEASURABLE NOW | Review rate is diagnostic, not automatically good or bad. |
| Review resolution rate | Are reviews being resolved? | Resolved reviews divided by total reviews. | resolved reviews / total reviews | review records with status = resolved and resolvedAt present | review records in window | review records | enterprise-scoped | pilot window | to be set by pilot owner | MEASURABLE NOW | Requires review records to include a resolved timestamp. |
| Review resolution time | How long does governance take to close a review? | Median and p95 elapsed time from review creation to review resolution. | elapsed ms | review resolution durations | resolved reviews | review records | enterprise-scoped | pilot window | median and p95 to be set | MEASURABLE NOW | Current implementation calculates elapsed time from persisted review timestamps. |
| Authority integrity rate | Does the authority chain remain complete and valid? | Percentage of governed actions with a complete, valid authority chain. | complete valid authority actions / governed actions | decisions with authorityIntegrity = true | governed decisions | decision records, authority context | enterprise-scoped | pilot window | 100% | MEASURABLE NOW | The service currently uses a boolean authority-integrity signal from the decision record. |
| Policy adherence | Does the runtime decision conform to the expected policy outcome? | Percentage of pilot cases whose runtime decision matches the expected policy label. | agreement / labelled cases | labelled cases where runtime decision = expected decision | labelled pilot benchmark cases | benchmark dataset | enterprise-scoped | benchmark window | to be set by benchmark owner | REQUIRES NEW EVENT DATA | This needs an explicit labelled benchmark set. |
| Governance exception rate | How often does governance need manual intervention because evidence or authority is incomplete? | Count and percentage of actions requiring manual intervention because authority, evidence, or policy was incomplete. | exceptions / decisions | decisions with incomplete authority, evidence, or policy state | governed decisions | decision records, review records | enterprise-scoped | pilot window | to be set by pilot owner | PARTIAL | Requires a persisted exception flag or a consistent review reason taxonomy. |

## Decision-quality benchmark

The benchmark is a labelled evaluation suite for realistic pilot actions. It is not a claim of universal correctness.

| Case type | Expected decision |
| --- | --- |
| valid authority + sufficient evidence | ALLOW |
| valid authority + insufficient evidence | REVIEW |
| expired authority | REVIEW or DENY depending on policy |
| revoked authority | DENY |
| wrong action | DENY |
| wrong resource | DENY |
| wrong tenant | DENY |
| invalid API key | DENY |
| challenge replay | DENY |
| provider unavailable | REVIEW |
| stale provider evidence | REVIEW |

The service computes agreement rate, false ALLOW count, false REVIEW count, and false DENY count from the labelled set and reports the sample size.

## Provider evidence metric

The provider evidence path is evaluated separately from enterprise authority.

| Metric | Business question | Definition | Formula | Numerator | Denominator | Source | Tenant scope | Window | Target | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider evidence decision impact | Does independent provider evidence change the decision appropriately? | Compare decisions from valid, missing, stale, invalid, and unavailable provider evidence scenarios. | decision outcome by scenario | scenario outcomes | scenario count | provider evidence scenario results | enterprise-scoped | pilot benchmark window | decision changes as expected by policy | PARTIAL |

## Latency metrics

Latency is measured separately for machine decision time and human review waiting time.

| Metric | Business question | Definition | Formula | Numerator | Denominator | Source | Tenant scope | Window | Target | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Median decision latency | How fast is the machine decision path? | Median latency across trust decisions. | median(decision latency values) | decision latencies | decisions with latency values | decision records | enterprise-scoped | pilot window | to be set by pilot owner | MEASURABLE NOW |
| p95 decision latency | How slow is the upper tail of the machine decision path? | p95 latency across trust decisions. | percentile(decision latency values, 95) | decision latencies | decisions with latency values | decision records | enterprise-scoped | pilot window | to be set by pilot owner | MEASURABLE NOW |
| p99 decision latency | What is the tail behavior of the decision path? | p99 latency across trust decisions. | percentile(decision latency values, 99) | decision latencies | decisions with latency values | decision records | enterprise-scoped | pilot window | to be set by pilot owner | MEASURABLE NOW |
| Human review duration | How long does a human review remain pending? | Review duration from creation to resolution. | review resolvedAt - review createdAt | resolved review durations | resolved reviews | review records | enterprise-scoped | pilot window | to be set by pilot owner | MEASURABLE NOW |

## Pilot scorecard service

The service in [src/lib/pilot/metrics-service.ts](src/lib/pilot/metrics-service.ts) is the read model for pilot metrics. It computes metrics from persisted decision, review, evidence, revocation, alert, and negative-test data. It must not fabricate values or use mock values.

## Continuous Trust contribution

Continuous Trust contributes to the pilot through alerts, drift findings, evidence references, status transitions, and review linkage. The current contract remains:

- CURRENT SIGNAL: alerts, severity, status, entity, evidence references, and timestamp
- DERIVED METRIC: alert coverage, review linkage, and drift visibility
- ROADMAP INTELLIGENCE: behavioral anomaly inference beyond the current persisted runtime contract

## Pilot evidence pack and executive summary

The pilot evidence pack should include:

- pilot scope
- time window
- tenant
- workflow
- number of actions
- decision distribution
- authority integrity
- evidence coverage
- Replay coverage
- recovery coverage
- security negative tests
- provider evidence status
- latency
- review metrics
- known limitations

The executive summary should present only measured values and clearly label any metric that remains partial or roadmap.

## Go / no-go guidance

Go only when:

1. unauthorized ALLOW = 0;
2. tenant isolation failures = 0;
3. invalid credential acceptance = 0;
4. challenge replay acceptance = 0;
5. post-revocation ALLOW = 0;
6. governed action coverage = 100% for the scoped workflow;
7. authority integrity = 100%;
8. evidence coverage = 100%;
9. Replay coverage = 100%;
10. recovery coverage = 100%;
11. no unresolved P0 security defect.

If any of the above cannot be demonstrated from persisted evidence, the pilot remains partial rather than ready for a closed commercial claim.
