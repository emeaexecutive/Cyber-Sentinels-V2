# Trust Decision Narrative™

## Evidence-first narrative

The Epic 38 narrative is a sequence of short `CitedStatement` values. Each sentence contains one or more supporting evidence IDs. Rendering resolves those IDs to the source and canonical reference recorded in `supportingEvidence`.

The narrative layer consumes the canonical decision evolution, recorded human review and Trust Journey references. It does not ask a model to fill gaps, infer a missing participant, soften a contradiction, or manufacture a complete story. If a citation is missing or unresolved, construction fails.

## Rules

1. Preserve claims supplied by accountable upstream systems or reviewers.
2. Cite at least one canonical evidence item in every sentence.
3. Keep uncertainty and assumptions explicit.
4. Preserve later changes alongside the original outcome.
5. Label AI and provider contributions as evidence or assistance, never authority.
6. Render missing recovery or review as not recorded, never as a successful stage.

## AI boundary

AI may summarize, cluster, explain, recommend, retrieve, or translate cited content. It cannot change trust, approve trust, override policy, change authority, create evidence, or remove uncertainty. The TypeScript contract fixes AI and provider `authoritative` values to `false`, and runtime validation enforces the same boundary.
