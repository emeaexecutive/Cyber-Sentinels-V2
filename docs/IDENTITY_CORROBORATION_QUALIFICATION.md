# Identity corroboration qualification

Date: 2026-09-29. Scope: local behavioral qualification of existing evidence, graph, memory and canonical decision helpers. No runtime code, provider integration, schema, API scope or dependency was added.

**Representation is supported; real corroboration remains provider-dependent.** Existing `EvidenceObject.evidenceType` can carry `IDENTITY_CORROBORATION:<category>` with tenant, subject, source, provider-event reference, timestamps, expiry, payload hash and explicit verification flags. These labels are fixture conventions within the existing extensible field, not newly registered provider signals or verified findings.

| Category | Evidence meaning retained | Boundary |
| --- | --- | --- |
| DOCUMENT | Document-check assertion and provider reference | No document authenticity inferred from the category |
| PROFESSIONAL | Professional-history or affiliation assertion | No employment, credential or reputation verdict |
| DIGITAL | Digital identity/account corroboration context | Account presence does not establish identity or authority |
| NETWORK | Network/device context | Network context does not establish identity or misconduct |
| INTERVIEW | Session/reviewer observation | Session findings are not a hiring judgment |
| AI_ASSISTANCE | Reported assistance/tool-use context | Policy interpretation remains separate; no fraud inference |
| DEEPFAKE | Attributed detector assertion | No detection accuracy or conclusive identity claim |
| THREAT | Attributed threat-context assertion | No conclusion about a person's intent |
| CONTRADICTION | Conflicting assertions with retained references | Human review can retain disagreement without rewriting history |

All nine local category fixtures remain `INCONCLUSIVE`, assurance `NONE`, unsigned and not server-verified. A graph connection describes an attributed relationship; it does not authenticate the provider or establish the truth of the claim.

## Existing paths exercised

The [qualification tests](../tests/identity-corroboration-qualification.test.mjs) call the real helpers:

- [Evidence validation and hashing](../src/lib/trust-architecture/evidence.ts): `validateEvidenceObject`, `evidenceObjectHash`, `evidencePayloadMatches`. All categories retain references and detect a changed payload.
- [Evidence Graph](../lib/evidence-graph/evidence-graph.ts): `EvidenceGraphBuilder`, `writeTrustMemoryGraphEdges`. Evidence/category/source references remain linked to the subject and memory. Contradiction flags remain visible; these operations create no authorization or decision node.
- [Metadata minimization](../src/lib/trust-architecture/evidence-graph.ts): `safeGraphMetadata`. Category/reference metadata survives while raw document, email, IP, biometric, token and provider-payload fields are excluded by the existing filter.
- [Trust Memory](../lib/trust-memory/trust-memory.ts): `createTrustMemoryEvent`, `validateTrustMemoryIntegrity`. Existing `identity_change` and `provider_conflict` events retain evidence, Replay and reviewer references with zero authority references. A mismatched tenant or unresolved evidence inventory fails the integrity check. These are in-memory integrity checks, not database RLS proof.
- [Federated claims](../lib/operational-entities/federated-evidence.ts): `classifyEvidenceIndependence`, `appendProviderEvidence`. Two systems from the same party remain single-source/same-party evidence. Multiple provider assertions from distinct parties remain multi-source, not automatically independently confirmed. Agent assertions and unconfirmed/unknown evidence remain insufficient. Contradictions append alongside the original record and keep correction references.
- [Public-client evidence restrictions](../lib/public-api/v1/client-evidence.ts): category labels remain `AGENT_ASSERTED:IDENTITY_CORROBORATION:<category>`; a client cannot impersonate an identity provider or submit the reserved independent-confirmation type.
- [Canonical decision and review](../src/lib/trust-transaction/canonical.ts): `executeCanonicalTrustTransaction`, `normalizeDecisionOutcomeReview`. Positive corroboration labels cannot supply missing or revoked authority. A later contradictory review retains the original ALLOW, policy/reasons and unchanged receipt digest; mutation of the decision-time snapshot throws.

The canonical cases reuse the existing synthetic OpenGraph fixture to exercise the one decision engine with contextual corroboration attached. Its executor is unconfigured and no provider is reached. This does not qualify an OpenGraph account, a human identity, an external claim, or an authenticated database write. A valid existing authority can authorize the fixture action; corroboration labels do not create that authority.

## Limits and smallest next step

No evidence representation gap was found. A new generic evidence model, a new confidence score, and broader identity-provider signal enums are unnecessary for these categories. An actual provider still needs an authenticated, tenant/subject-bound ingestion path with freshness, provenance and applicable policy checks. The existing narrow [identity signal types](../lib/identity-signals/types.ts) should not automatically treat professional, network, interview or detector context as verified identity signals.

The [identity confidence helper](../lib/identity-signals/core.ts) has a known aggregation limitation: `calculateIdentityConfidence` counts qualifying records, rather than distinct independent sources. Supplying the same verified event twice can produce `ESTABLISHED` with two counted signals. Its result is therefore not proof of independent corroboration. This qualification neither changes that algorithm nor endorses its duplicate behavior. Source-party classification also relies on attributable input; a supplied party label is not proof that an independent organization produced the evidence.

The smallest remaining work is qualification of a real source through the existing evidence path, followed by evidence-grounded review. Identity corroboration does not establish business mandate, action authority, delegation, runtime integrity, execution success, provider honesty or fraud. Historical evidence and review remain separate from the immutable canonical decision.

## Validation

Command: `npx tsx --test --test-reporter=spec tests/identity-corroboration-qualification.test.mjs`

Result: **17 passed, 0 failed, 0 skipped**. Synthetic evidence and dependency fixtures only; no network/provider calls, database writes, deployment or commit. The parent task integrates this file into the suite and performs broader validation.
