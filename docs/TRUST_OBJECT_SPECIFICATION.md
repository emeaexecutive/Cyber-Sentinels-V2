# Canonical Trust Object™ Specification

The Trust Object is the provider-neutral current-state projection for an enterprise subject. It references canonical records; it never copies source payloads or creates an independent trust engine.

## Subjects and states

Supported classes are `human`, `ai_agent`, `machine_identity`, `device`, `organization`, `workflow`, `application`, `api`, `model`, `document`, `provider`, `infrastructure_resource` and `external_system`.

Trust states are exclusively `verified`, `degraded`, `contested`, `suspended` and `revoked`. Provider state is exclusively `available`, `degraded`, `unavailable`, `contradicted` and `unknown`. The strongest adverse applicable trust state wins; there is no arbitrary numeric score.

## Canonical fields

`EnterpriseTrustObject` contains `enterpriseId`, `subjectType`, `subjectId`, `displayIdentity`, `identityState`, `authorityState`, `environmentState`, `scopeState`, `evidenceCompleteness`, `trustState`, `providerState`, `activeContradictions`, `activeIncidents`, `activeReviews`, `correctiveActions`, `trustDnaReference`, `continuousTrustReference`, `replayReference`, `trustMemoryReference`, `evidenceGraphNodeReference`, `policyId`, `policyVersion`, `lastEvaluatedAt`, `correlationId` and `canonicalDigest`.

Compatibility aliases (`subject`, `currentTrustState`, older reference names and summary counts) remain temporarily available to existing consumers. They are projections of the canonical fields, not independent data.

## Evidence and digest rules

Active arrays contain IDs, states/reasons and evidence references only. Source payloads remain in Identity, Authority, Scope Continuity, Serious Incident, Evidence Graph, Replay or Trust Memory. Evidence completeness is explicit. The digest is SHA-256 over canonical content before the digest field is added, so identical input produces an identical Trust Object.

## Security and lifecycle

The database object is a security-invoker view. Tenant access is inherited from canonical source RLS. Historical state belongs in immutable source decisions and the Enterprise Trust Timeline; the current object never rewrites history. Legal conclusions are represented only by external references.

## Cross-Epic example

The deterministic Epic 26/27 fixture represents an AI agent authorized only for simulation. Independent evidence observes internet and production reachability, Scope Continuity denies or revokes scope, a serious incident is opened, and the Trust Object preserves the strongest adverse state with linked contradiction, snapshot, review and corrective-action records.
