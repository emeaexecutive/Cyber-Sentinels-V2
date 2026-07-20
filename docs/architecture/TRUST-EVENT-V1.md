# Trust Event v1

Trust Event v1 is the canonical, append-only record connecting provider evidence to a tenant, subject, actor, workflow, session and authority context. Its schema identifier is `trust-event-v1`; event types belong to the versioned namespaces `identity`, `device`, `session`, `authority`, `workflow`, `runtime`, `security`, `governance`, `provider` and `system`.

Every event contains UUID `eventId` and `enterpriseId`, typed subject and actor references, optional workflow/session/authority references, provider protocol and delivery references, allowlisted normalized facts, reason codes, Evidence Vault references, occurred and received timestamps, ordering metadata, and integrity metadata. Subjects are `HUMAN`, `AI_AGENT`, `SERVICE`, `DEVICE`, `WORKLOAD`, `ORGANIZATION` or `UNKNOWN`. Actors are `USER`, `AI_AGENT`, `SERVICE`, `SYSTEM`, `ADMINISTRATOR`, `PROVIDER` or `UNKNOWN`.

The ledger has one `default` chain per enterprise. Sequence starts at 1; each event points to the preceding event hash. A late event preserves its original `occurredAt`, receives a later `receivedAt`, and sets `ordering.late`. Corrections point to immutable history through `ordering.supersedesEventId`; accepted rows are never rewritten.

`eventHash` is excluded from its own hash payload. All other fields, including `schemaVersion`, `canonicalization`, `hashAlgorithm`, `sequence` and `previousHash`, are covered. See `TRUST-EVENT-INTEGRITY.md` for the byte-level rules.

The existing historical `trust_events` table is extended additively. Only rows whose `schema_version` is `trust-event-v1` participate in this canonical chain; legacy records remain readable under their prior ownership policy and cannot be mistaken for canonical events. Forward-safe database checks enforce canonical subject, actor, protocol, namespace, integrity metadata and required fields for new v1 rows without retroactively rewriting legacy history.

Collection APIs order by `receivedAt` and `eventId` and expose an opaque compound cursor. The event ID tie-breaker prevents skips or duplicates when multiple events share a timestamp.
