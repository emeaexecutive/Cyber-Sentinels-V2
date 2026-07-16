# Evidence Graph RC5

## Purpose

Evidence Graph remains the existing protected relationship model. RC5 strengthens its evidence semantics without adding another graph or system of record.

## Relationship evidence

Graph relationships now expose:

- confidence weighting, or `Unavailable` when not supplied;
- strong, moderate, weak or unknown relationship strength;
- provider provenance;
- fresh, stale, expired or unknown freshness;
- explicit expiry time when recorded;
- contradiction indicators;
- missing-evidence indicators;
- Replay references.

## Evidence Coverage

The protected `/admin/evidence-graph` view reports Verified, Pending, Missing, Expired and Contradictory evidence for each workflow assessment. Graph health includes node and relationship totals, orphaned nodes, verified coverage, expired relationships, contradictions, missing-evidence relationships and Replay-linked relationships.

## Boundary

Coverage is derived from retained relationships. Unknown freshness remains unknown. Relationship confidence is source-specific evidence weighting, not an authenticity score.
