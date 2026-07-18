# ADR-002: Replay

## Status

Accepted.

## Context

Operational trust decisions require a chronological account of evidence, authority, policy, runtime change and review. Logs alone are inconsistent, mutable in presentation and insufficient for buyer, governance and incident reconstruction.

## Decision

Maintain Replay as a first-class chronological evidence model. Replay events include tenant and workflow scope, correlation, actor, stage, state, decision references and timestamps. Runtime writes publish operational events and retain pending-write diagnostics when durable persistence is unavailable. Replay explains the sequence; it does not replace source evidence or invent missing events.

## Alternatives

- Use application logs only: rejected because logs are not a stable domain contract.
- Reconstruct chronology from database timestamps: rejected because causal and authority relationships would be ambiguous.
- Store screenshots as the record: rejected because screenshots are incomplete and difficult to validate.

## Consequences

- Workflows must emit stable correlation and evidence references.
- Replay schema compatibility and ordering need tests.
- Degraded persistence must remain visible.
- Retention volume grows with workflow activity.

## Security impact

Replay records can expose sensitive operational context. Access is tenant-scoped, protected, minimized and non-authorizing. Integrity, attribution and append-only handling are required; secrets and raw restricted payloads are prohibited.

## Future work

Strengthen durable queue recovery, integrity proofs, retention controls and export interoperability while preserving chronology and attribution.
