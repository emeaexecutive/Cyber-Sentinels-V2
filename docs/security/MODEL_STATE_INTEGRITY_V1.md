# Model State Integrity — V1 Security Closure

## Scope and architecture boundary

Model State Integrity is a derived evidence extension of the existing Cyber Sentinels Trust Fabric. It is not a product, scanner, firewall, identity authority, evaluator, graph, memory, or runtime store. The canonical Trust Fabric remains the only component that may return `ALLOW`, `REVIEW`, or `DENY`.

The extension makes one distinction explicit:

`MODEL_IDENTITY != MODEL_STATE_INTEGRITY`

A stable model ID and version do not prove that the active artifact, template, adapter, inference configuration, router, endpoint, network boundary, or authentication posture still correspond to the state qualified for an Agent Passport, deployment, and Authority Lineage.

## Evidence contract

The approved baseline is an immutable, tenant-scoped snapshot derived at deployment qualification. Current state is a provider-neutral observation. Both use digests, bounded metadata, references, timestamps, evidence providers, and stated limitations. The contract rejects raw model weights, full prompt or template bodies, credentials, tokens, private keys, and secret-like values.

The baseline and observation preserve separate digests for:

- agent system prompt;
- model template;
- runtime inference configuration;
- model artifact and runtime image;
- adapter, inference, tool-parser, and general configuration.

Network and authentication values are bounded evidence postures, not vulnerability findings. Endpoint lineage records an approved or observed endpoint, routing provider, intermediary, and final inference server without performing discovery or scanning. Router evidence preserves provider-supplied router identity/version, policy digest, selected and fallback models, and selection reason.

## Evaluation and authority

The deterministic model-state comparison derives match, expected-change, drift, unresolved, provider-conflict, insufficient-evidence, and review states. A mismatch can emit `MODEL_STATE_DRIFT`, but drift never means compromise, exploitation, or maliciousness. Material change without an approved attributable event emits `MODEL_STATE_CHANGE_ORIGIN_UNRESOLVED`; it does not automatically create an incident.

The result feeds the existing Trust Forecast and therefore the existing Trust Pressure, Trust Budget, Trust Twin, Adaptive Verification, Sentinel, and AI Deployment Trust Gate paths. These projections may recommend current proof, runtime attestation, requalification, reauthorization, or revalidation. They cannot grant authority and cannot independently deny an action. A valid Authority Lineage also does not authorize an unapproved model state: the canonical evaluator considers authority, model state, validation state, and policy together.

All new trust-invariant templates are emitted as `RECOMMENDED_DISABLED`. Activation remains an explicit policy-governance action.

## Existing Fabric persistence

No schema or runtime store is required. The assessment is nested in the existing immutable decision-time snapshot and Trust Twin, then projected into the existing provider-neutral evidence, Evidence Graph, Replay, Trust Memory, Sentinel brief, deployment gate, and canonical receipt. Existing canonical transaction persistence already stores the decision-time snapshot as JSON evidence, preserving historical state without a parallel source of truth.

Trust Memory accepts only material model-state lifecycle events. Replay preserves what was approved and known at action time separately from later advisory intelligence. A retrospective recommendation identifies potentially affected references while explicitly declining to infer historical exploitation.

## Regulated-context compatibility audit

The existing canonical transaction already preserves the requested action purpose, policy and entitlement version, source evidence, provider/third-party agent references, accountable owner and reviewer state, human intent/review, execution continuity, destination, consequence, and observed outcome. A matter, customer, or case identifier can be carried as the existing action resource, correlation/reference metadata, or provider-neutral evidence context without a schema change.

This is compatibility only. A domain-specific regulated workflow, retention profile, case-system adapter, or additional semantics remain a V1.1 integration. No regulated system of record is replaced.

## ATS trust writeback — V1.1 contract only

No ATS integration is added by this security closure. A future provider-neutral writeback should carry:

| Field | Existing Cyber Sentinels source |
| --- | --- |
| candidate identity state | operational entity and Identity Continuity evidence |
| session trust | decision-time snapshot / Trust Twin state |
| policy outcome | canonical decision and reason codes |
| intervention | Adaptive Verification or canonical control recommendation |
| human review | reviewer state, accountable human, signed intent reference |
| Identity Continuity Receipt | canonical receipt reference |
| evidence link | Evidence Graph / Replay reference |

The ATS remains the hiring system of record. The contract has no Greenhouse-, Brainner-, or other provider-specific dependency and is classified `V1.1 INTEGRATION`.

## Release classification

This implementation closes a material integrity-proof gap for deployments and consequential AI-agent actions that supply model-state evidence. It is fail-safe at the canonical boundary: unresolved or drifted state becomes review/requalification evidence, while invalid authority still follows the existing hard-deny path. It introduces no database migration, production configuration, live provider dependency, or deployment action.
