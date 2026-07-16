# Continuous Authorization

`evaluateContinuousAuthorization()` is a context-change gate over the existing Authority Graph and enforcement path. It is not a second authorization or enforcement engine.

Authorization is evaluated initially and again when action, tool, resource, workflow stage, delegation-chain version, expiry, revocation, runtime risk, provider freshness, policy version, sub-agent creation or transaction threshold changes. The result records the triggers, bounded outcome, constraints, authority reference and Living Trust Profile key. Every critical outcome requires the existing enforcement receipt, Replay and Trust Memory path.

Fail-closed rules:

- missing, expired or revoked authority blocks;
- critical runtime risk pauses;
- expired provider evidence requires step-up;
- a policy threshold requires accountable approval;
- high observed risk routes to review;
- allowed actions remain constrained to the evaluated tool, resource, workflow stage, purpose and policy.

Authentication is never treated as durable authorization.
