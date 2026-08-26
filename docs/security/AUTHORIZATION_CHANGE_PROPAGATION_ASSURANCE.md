# Authorization-Change Propagation Assurance

## Principle

Authorization-change propagation extends the existing Authority Integrity evidence model. A provider or control-plane acknowledgement is evidence of a requested/applied change, but is not proof that the old authority has stopped working at the runtime or destination.

`CONTROL_PLANE_REVOKED != DOWNSTREAM_ENFORCED`

## Evidence timeline

For a grant change, downgrade, revocation, expiry, credential rotation, or policy change, the assessment preserves references and timestamps for:

1. change requested and the authority version before/after;
2. control-plane acknowledgement;
3. runtime state update;
4. credential refresh, rotation, or revocation;
5. downstream state update; and
6. destination-effective confirmation.

The timeline is emitted through the existing Replay output and stored in the canonical decision-time snapshot. Material states also use the existing Trust Memory event path.

## States

The provider-neutral assurance states are:

- `PROPAGATION_PENDING`: a change is acknowledged or reported, but runtime/destination proof is not yet complete;
- `PROPAGATION_CONFIRMED`: runtime and destination evidence both show that the old authority is rejected;
- `PARTIAL_PROPAGATION`: one relevant downstream layer confirms the change and another does not;
- `STALE_AUTHORITY_POSSIBLE`: an acceptance signal exists but lacks sufficient post-change confirmation;
- `STALE_AUTHORITY_CONFIRMED`: post-effective-time evidence shows the old authority is still accepted;
- `PROPAGATION_CONFLICT`: provider/runtime/destination observations conflict;
- `INSUFFICIENT_EVIDENCE`: no usable change evidence exists; and
- `UNDER_REVIEW`: evidence exists but does not support a stronger state.

`STALE_AUTHORITY_STILL_ACTIVE` is emitted only for confirmed post-change acceptance. Missing runtime proof or stale telemetry alone does not produce that finding.

## Existing Fabric integration

Propagation state contributes to Forecast, Twin, Adaptive Verification proof requirements, Authority Sentinel recommendations, Graph projections, Replay, Trust Memory, and the safe receipt summary. The canonical evaluator alone decides the action. Counterfactual propagation delays operate on isolated Twin projections and never mutate authority or execute an action.

No new table, migration, propagation service, or enforcement engine is introduced.
