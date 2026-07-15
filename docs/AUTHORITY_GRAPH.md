# Authority Graph

The authority graph is the single tenant-scoped model for delegation before execution. The existing authorization gateway remains the enforcement boundary; the graph proves how delegated scope reached the requesting subject.

## Supported relationships

- Organization -> Human
- Organization -> AI Agent
- Human -> AI Agent
- Human -> Machine Identity
- AI Agent -> AI Agent

Machine identities cannot delegate further. Unsupported relationship types fail closed.

## Grant contract

Every grant records a global grant ID, tenant, grantor and grantee types/IDs, scope, parent grant, issue/expiry/revocation time, maximum delegation depth, workflow/action/purpose constraints and evidence references.

## Evaluation

`evaluateAuthorityGraph()` performs these checks in order:

1. find a terminal grant for the subject in the same tenant;
2. reconstruct the parent chain and reject missing parents or cycles;
3. reject future-dated, expired or revoked grants;
4. validate supported delegation relationships and parent-to-child identity linkage;
5. require child scope to be a subset of parent scope;
6. enforce every ancestor's maximum delegation depth;
7. require child workflow/action/purpose constraints to narrow or inherit parent constraints;
8. require the requested workflow, action, purpose and scope to remain inside the effective intersection.

An ambiguous or incomplete chain returns `DENY`. Denied context remains reviewable; it is never promoted through fallback inheritance.

## Privilege-escalation protection

Maximum scope inheritance is intersection-based. A child may narrow authority but cannot add an action, purpose or workflow that an ancestor did not grant. Revocation and expiry apply at evaluation time to every link, not only the terminal grant.

The result includes the evaluated chain, effective scope/constraints, accountable human when present, evidence references, individual checks and limitations. It is valid only for the evaluated tenant, workflow, action, purpose and time.
