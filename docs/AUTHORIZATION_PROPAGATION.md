# Authorization Propagation

The canonical Authority Graph supports organization → human, human → agent, organization → agent, agent → sub-agent, human → machine identity and agent → machine identity.

An RC2 delegation records delegator, delegate, purpose, permitted actions, prohibited actions, resource scope, maximum depth, expiry, revocation, approval requirements, policy version and evidence references. Legacy grants remain readable, but missing constraints cannot be inferred.

Authority attenuates through the entire chain:

- a child may narrow permitted actions and resource scope;
- inherited prohibitions cannot be removed;
- workflow, action and purpose constraints can only narrow;
- every ancestor's depth ceiling applies;
- required approvals and policy version are evaluated before execution;
- machine identities cannot delegate further.

Any cycle, missing parent, tenant mismatch, unsupported relationship, broadening, expired/revoked grant or context mismatch returns `DENY` and retains the failed checks for review.
