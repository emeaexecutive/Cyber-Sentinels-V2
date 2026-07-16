# Living Trust Profile

The Living Trust Profile is a derived, tenant-scoped view of current operational trust. Its canonical service is `lib/trust/living-trust-profile.ts`. It composes existing identity, workflow, authority, credential, provider, runtime, Evidence Graph, Replay, Trust Memory™, reviewed-outcome, governance and policy records; it is not a new Trust Engine.

Every profile key includes tenant, entity, entity type, workflow, purpose, requested action, policy version and assessment timestamp. The same entity can therefore be allowed with constraints in one workflow, require review in another and remain blocked or insufficient in a third. No posture transfers universally.

The output contains current posture, eight assurance dimensions, active authority, evidence completeness, confidence band, attributable trust changes, unresolved risks, governance state, reassessment date, reasons, limitations, source references, Replay availability and recommended action. Calculated values are derived at read time and are not persisted as a second source of truth.

Supported outcomes are `allow`, `allow_with_constraints`, `step_up`, `require_approval`, `review`, `pause`, `terminate`, `block` and `insufficient_evidence`. Missing source records remain missing. Provider or runtime evidence cannot grant authority.

Boundary: **Valid for this organization, workflow, purpose and assessment time.**
