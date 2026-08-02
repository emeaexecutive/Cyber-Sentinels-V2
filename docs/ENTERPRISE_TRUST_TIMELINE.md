# Enterprise Trust Timeline™

The timeline is a tenant-safe projection over canonical Replay, Trust Memory, Trust Events, Scope Continuity replay and serious-incident chronology. It is not another append-only event store.

## Categories and attribution

The categories are `IDENTITY`, `AUTHORITY`, `ENVIRONMENT`, `SCOPE`, `PROVIDER`, `POLICY`, `TRUST_STATE`, `INCIDENT`, `REVIEW`, `LEGAL`, `REGULATOR` and `CORRECTIVE_ACTION`.

Each item preserves category, event type, source, source type, source authority, timestamp, timestamp confidence, evidence strength, integrity status, enterprise, subject, correlation ID, evidence references, supersession, uncertainty and Replay classification. Missing direct evidence remains an uncertainty; the projector never fabricates an action.

## Projection rules

- Source IDs must be unique within an enterprise.
- Cross-tenant input fails closed.
- Timestamp order is deterministic; equal non-confirmed timestamps are marked uncertain.
- Corrected evidence supersedes prior evidence and never rewrites it.
- Legal timeline items refer to externally authored decisions only.
- Access denial does not reveal whether another tenant's source exists.

The API route `/api/trust-fabric/timeline/[subjectType]/[subjectId]` authenticates the caller and projects canonical source views. The Trust Centre links the unified timeline to the existing Replay surface.

## Replay availability

Availability remains distinct: `ready`, `empty`, `evidence_missing`, `source_unavailable`, `generation_failed` and `access_denied`. Provider-backed Replay requires attributed provider evidence references; activity counts alone are not evidence.

## Cross-Epic chronology

The synthetic fixture preserves declaration, independent observation, contradiction, scope decision, incident occurrence/detection/awareness, containment request, provider acknowledgement, review, corrective action and internal draft package formation. Acknowledgement is not confirmation, operational screening is not a legal conclusion, and no external submission is implied.
