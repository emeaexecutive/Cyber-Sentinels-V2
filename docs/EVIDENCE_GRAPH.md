# Evidence Graph Alpha

Release: 0.5 Evidence Graph Alpha

## Purpose

The Cyber Sentinels Evidence Graph answers the CISO question:

Can I explain WHY this was trusted?

The intended answer is yes when the graph can connect actor, authority, workflow, evidence, replay, governance and Trust Memory records into an explainable path. If supporting relationships are missing, the answer is no and the missing path becomes a review prompt.

## Relationship Model

Evidence Graph nodes:

- Human
- AI Agent
- Machine Identity
- Credential
- Provider
- Workflow
- Evidence
- Replay Event
- Governance Review
- Trust Memory Event
- Trust Posture

Evidence Graph relationships:

- owns
- delegates
- uses
- initiated
- verified_by
- generated
- reviewed
- approved
- blocked
- restored
- supports

Every relationship stores:

- timestamp
- confidence
- source
- replay reference

## Why Graphs Matter

Enterprise trust is not a single score. It is a relationship between who acted, what acted, what authority existed, what evidence supported the action, what replay can reconstruct, who reviewed it and what changed in Trust Memory.

A graph makes those relationships explicit. It lets the platform explain trust as a connected operational record instead of a disconnected list of logs, receipts, provider outputs and review notes.

## Explainability

The graph query layer supports:

- Explain trust
- Explain authority
- Show evidence chain
- Show workflow history
- Show trust evolution
- Show governance history

The alpha implementation treats missing evidence as an explanation gap. It does not infer trust from absent data and does not expose raw provider payloads.

## Enterprise Investigations

Investigators can use the graph to answer:

- Which human or AI agent initiated the workflow?
- Which provider evidence supported the workflow?
- Which replay reference reconstructs the event?
- Which governance review approved, blocked or restored trust?
- Which Trust Memory event changed the posture?
- Which decision can be explained later?

The admin surface at `/admin/evidence-graph` provides a visual enterprise graph with filters for Human, AI Agent, Workflow, Credential, Trust Memory, Replay and Governance.

## Compliance

Evidence Graph Alpha is admin protected. The API at `/api/evidence-graph` returns normalized graph data only:

- No secrets.
- No raw provider payloads.
- No unrestricted customer evidence.
- No new source of record.
- No autonomous trust verdict.

The graph is an explainability layer over existing records and normalized provider evidence.

## Integration Points

- Trust Memory writes graph edges through `writeTrustMemoryGraphEdges`.
- Replay writes graph edges through `writeReplayGraphEdges`.
- Governance writes graph edges through `writeGovernanceGraphEdges`.
- Validation writes graph edges through `writeValidationGraphEdges`.
- Provider results are normalized through `normalizeProviderGraphEvidence` and attached through `writeProviderGraphEdges`.

These integration points avoid duplicated logic and keep graph construction centralized in `lib/evidence-graph/evidence-graph.ts`.

## Demo Story

The deterministic demo graph shows:

Human -> AI Agent -> Workflow -> Provider Evidence -> Replay -> Governance -> Trust Memory -> Decision

The demo is available from `/admin/evidence-graph?demo=1` and contains no customer data.

## Future Roadmap

- Persist selected graph edge snapshots only after schema, RLS and retention policy are approved.
- Add subject-scoped graph queries for replay and receipt pages.
- Add path-depth controls for investigations.
- Add exportable compliance summaries.
- Add graph diffs that show trust change between two replay timestamps.
- Add provider-specific evidence adapters only through the shared normalizer.
