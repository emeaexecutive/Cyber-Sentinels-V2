# ADR-003: Trust Memory

## Status

Accepted.

## Context

A single trust score cannot explain how confidence, evidence and review evolve across a human, AI agent, machine identity or workflow. Reviewed outcomes should improve future context without silently changing policy or rewriting history.

## Decision

Represent Trust Memory as append-only, attributed events and derived snapshots. Events retain actor type, scope, evidence sources, reason, prior state, new state and time. Integrity validation checks chronology, references, attribution and isolation. Reviewed outcomes may add context, but they do not automatically modify authoritative policy or authorize execution.

## Alternatives

- Persist only the latest score: rejected because history and rationale disappear.
- Mutate a profile in place: rejected because auditability and correction history are lost.
- Automatically train or tune policy from outcomes: rejected until reviewed evidence and governance thresholds support it.

## Consequences

- Snapshots are derived and can be rebuilt.
- Consumers must tolerate incomplete history and explicit uncertainty.
- Storage and retention requirements grow over time.
- Corrections are new events rather than destructive edits.

## Security impact

Trust Memory requires tenant isolation, controlled actor identifiers, evidence minimization and retention enforcement. Derived context must never leak across tenants or become an unreviewed authorization shortcut.

## Future work

Add durable storage contracts, retention/deletion workflows, cryptographic continuity evidence and reviewed calibration gates.
