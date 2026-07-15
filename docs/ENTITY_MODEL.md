# Canonical Entity Model

Every Trust Fabric record uses the normalizer in `lib/core/entity-identity.ts`.

## Entity types

| Type | Operational role |
| --- | --- |
| Human | Authenticated person, reviewer or accountable owner |
| AI Agent | Registered agent with delegated authority and runtime receipts |
| Machine Identity | Service/workload identity with credential lineage |
| Organization | Tenant owner and governance boundary |
| Workflow | Purpose, policy and lifecycle context |
| Credential | Issuer, owner, scope, expiry and rotation context |
| Session | Authenticated actor, channel and runtime continuity |
| Evidence | Source, integrity and retained reference |
| Decision | Policy, evidence basis and allow/review/block outcome |
| Replay | Retained chronology and workflow reconstruction |
| Authority | Grantor, grantee, scope, constraints and revocation |
| Provider | Provider, model, version, state, limitations and evidence boundary |

`regulated_workflow` remains an accepted compatibility alias for records written before the canonical `workflow` type. New template records use `workflow`.

## Shared fields

Every normalized entity has:

- `id` and tenant-qualified `global_id`;
- `tenant_id`;
- accountable `owner` and authority description;
- trust posture, verification status, governance status and risk level;
- lifecycle state with created, updated, expiry and revocation times;
- typed relationships;
- evidence and Replay references;
- type-specific evidence metadata;
- a boundary stating that identity context is not biometric certainty or autonomous authenticity proof.

Unknown ownership, authority, lifecycle dates and evidence are represented explicitly. The normalizer does not invent tenant state, verification or trust.
