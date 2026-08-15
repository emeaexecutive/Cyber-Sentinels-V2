# Inter-Agent Authority Conflict Evidence

Inter-Agent Authority Conflict Evidence extends the existing Operational Entity, Authority Lineage, Evidence Graph, canonical transaction, Replay, Trust Memory, Continuous Trust, and governance-review architecture. It is not an orchestrator, scheduler, swarm manager, dispatcher, or agent messaging system.

## Purpose

Separately legitimate authorities can become incompatible when objectives and actions intersect. Cyber Sentinels preserves evidence of that condition and feeds it to the existing `ALLOW`, `REVIEW`, or `DENY` path. It does not infer malicious intent.

## Inputs

- Two tenant-bound Operational Entities.
- Their existing authority envelopes, delegated objectives, exact requested actions, scope, expiry, and revocation state.
- Shared workflow, resource, credential/tool, and relationship observations.
- Attributed relationship evidence with provider, source party, observation time, digest, and independence flag.
- Existing operational consequence classification and enterprise policy.

Delegated objectives are minimized to structured operational purpose, effect, and resource. Hidden reasoning, prompt content, credentials, tokens, and private keys are excluded.

## Algorithm and outputs

`evaluateInterAgentAuthorityConflict` computes the existing authority-scope intersection and returns a condition state:

- `NO_CONFLICT`
- `POTENTIAL_CONFLICT`
- `INTER_AGENT_CONFLICT`
- `UNKNOWN`

It also returns evidence references, independence, reason codes, policy response, immutable snapshot digest, and a canonical decision contribution. Shared resources and compatible reads are not conflicts. Ordinary out-of-scope, expired, or revoked authority remains an ordinary `DENY`, not an inter-agent conflict.

First-class conditions include incompatible objectives, competing mutation, peer disable or work modification, impersonation evidence, credential/tool interference, contradictory approval requests, repeated denial cycles, authority collision, objective/authority mismatch, conflicting destination actions, and shared-resource races. These terms describe observed conditions; they do not assert fraud, sabotage, collusion, or malicious intent.

## High-consequence rule and arbitration

Confirmed conflict at or above the configured high-impact threshold can never silently `ALLOW`. The minimum outcome is `REVIEW`, unless the existing policy names a `DENY` condition. Policy responses are `CONTINUE`, `CONSTRAIN_AUTHORITY`, `REQUIRE_HUMAN_ARBITRATION`, `ISOLATE_AGENT`, or `SUSPEND_ACTION`.

Human arbitration reuses the existing review workflow. `appendHumanArbitrationOutcome` appends reviewer, decision, time, reasons, and evidence to the frozen conflict digest; it never rewrites relationship evidence or the original decision snapshot.

## Existing stores reused

- Authority Lineage and the Authority Graph remain the source of scope, depth, expiry, revocation, cycle, blast-radius, and cascade truth.
- Evidence Graph uses its existing `ASSERTS`, `DERIVED_FROM`, `AUTHORIZED_BY`, `PARTICIPATED_IN`, `APPLIES_TO`, `CONFLICTS_WITH`, and outcome relationships.
- Replay preserves authority-active, relationship-observed, intersection-evaluated, conflict, action, review/arbitration, constraint, execution/non-execution, and outcome chronology.
- Trust Memory records only first observation, escalation, authority constraint, arbitration completion, resolution, and restoration material events. Event IDs deduplicate retries.
- Continuous Trust can degrade authority/action compatibility while identity remains verified.
- The canonical transaction freezes relationship evidence, authority intersection, conflict state, policy response, and arbitration reference.

No new persistence table or migration is required. Existing tenant-scoped and append-only canonical structures can represent the projection and preserve query integrity without a parallel relationship graph.

## Qualification scenarios

- Beta reads repository A while Gamma reads repository B: no conflict.
- Beta and Gamma both read repository A: shared resource, no conflict.
- Incompatible mutations of the same high-consequence destination: conflict and minimum review, with evidence and Replay.
- One agent outside its own authority: ordinary authority denial, not conflict.
- Alpha revocation invalidating Beta: authority invalidation, not conflict.

Tests additionally cover peer interference conditions, contradictory approvals, repeated denial, false-positive avoidance, cross-tenant injection, high-consequence escalation, human arbitration, snapshot immutability, Replay chronology, and Trust Memory deduplication.
