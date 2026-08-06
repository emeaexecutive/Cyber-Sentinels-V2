# Trust Decision Intelligence™

## Epic 38 mission

Trust Decision Intelligence is the explainable decision layer over the existing Cyber Sentinels trust architecture. It preserves the outcome, the reason for the outcome, the evidence and authority available at the time, later corrections, and the final enterprise outcome.

It does not create another Trust Fabric, Replay engine, Trust Memory, Authority Lineage, Evidence Graph, Trust Journey, or Decision History. The canonical object stores immutable references and content hashes for those systems.

## Architecture reused

| Requirement | Canonical source consumed | Decision object field |
| --- | --- | --- |
| Operational decision identity | Trust Fabric decision contract | `decisionId`, `decisionType`, `decisionOwner` |
| Trust state | Trust State | `trustState` |
| Subject-level trust projection | Enterprise Trust Object | `trustObjectReference` |
| Append-only decision chronology | Enterprise Decision History | `decisionHistoryReference` |
| Authority at decision time | Authority Lineage | `authoritySnapshot`, `authorityLineageReference` |
| Policy at decision time | Trust Policy | `policySnapshot` |
| Evidence and relationships | Evidence Graph | `evidenceSnapshot`, `supportingEvidence`, `evidenceGraphReference` |
| Chronology | Replay | `replayReference` |
| Enterprise memory | Trust Memory | `trustMemoryReference` |
| End-to-end context | Trust Journey | `journeyReference` |
| Explanatory and reviewed context | Trust Decision Intelligence contract plus recorded human review | cited narrative and reviewer fields |

The implementation lives in `src/lib/trust-decision-intelligence`. It is a pure composition layer and has no production database, deployment, provider call, policy mutation, or trust mutation side effect.

## Capabilities

- `createCanonicalTrustDecision` constructs a deterministic, SHA-256 integrity-bound record.
- `validateCanonicalTrustDecision` fails closed on incomplete snapshots, broken references, unsupported AI behavior, unresolved citations, chronology errors, or content-hash mismatch.
- `evaluateTrustDecisionHealth` classifies Stable, Changed, Contradicted, Recovered, Incomplete, Pending, Expired, and Superseded records.
- `renderTrustDecisionNarrative` resolves every narrative sentence to preserved supporting evidence.
- `buildExecutiveMode` creates Board, CEO, CISO, Audit, Legal, Risk, Operations, and Finance reports from the same evidence.
- `buildDesignPartnerDemonstration` projects the required candidate-to-executive flow without duplicating the underlying systems.
- `buildInvestorDecisionDemonstration` measures the accumulation of evidence, review, replay, and evolution context.
- specialist-model request and response contracts prepare for future advisory models without training or invoking a model.

## Architecture review

The package is additive, deterministic, provider-neutral, tenant-identifiable, integrity-bound, and non-mutating. Its references point outward to canonical systems; it contains no alternative engine or event store. A decision is invalid when explanatory claims cannot resolve to preserved evidence. Evolution entries are chronological and append-oriented. The original decision remains visible when later evidence contradicts or supersedes it.

## Moat review

This capability remains valuable if every foundation model becomes free. A model can summarize a supplied context, but it does not possess an enterprise's historical decisions, authority at decision time, policy versions, evidence provenance, reviewer corrections, recoveries, or replayable operational outcomes. Those governed and customer-specific records compound with every decision. Their continuity and attribution—not inference cost—create the durable enterprise asset.

## Production boundary

Epic 38 does not apply migrations, call live providers, deploy, mutate production trust, approve trust, change authority, change policy, create evidence, or remove uncertainty.
