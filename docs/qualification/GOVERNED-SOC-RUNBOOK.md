# Governed SOC candidate

This candidate composes PR #135's authenticated synthetic watchtower warnings and PR #137's scratch-tree TypeScript fix. It does not merge either PR into main. The existing authority resolver, registered identities, signed runtime keys, CAS journal, containment fences and Replay remain the enforcement boundary.

## Qualification boundaries

- The current source accepts only the explicitly labelled signed synthetic export warning. It is a real authenticated intake, not a connector for customer telemetry.
- TORCH scoring, investigation selection, Sentinel Intelligence and CHIRIVETA review are deterministic. Sentinel Copilot uses the OpenAI Responses API only when explicitly configured. A model never grants authority or chooses a dispatch adapter.
- `GovernedSoc.respond` supports only `BLOCK_SYNTHETIC_ACTION` targeting `synthetic:customer-export` in `test` with `LOW` consequence. The trusted destination adapter must enforce reversible blocking semantics. No arbitrary command or destructive action is exposed.
- The web operations endpoint supports evidence intake, investigation and feedback. Hosted response dispatch remains disabled until a destination adapter, current authority resolver and independent outcome verifier are configured and qualified. The module's executable local workflow does not establish hosted readiness.
- The supplied local demo and transport tests use synthetic identities and model fixtures. They must never be described as successful live model or hosted provider execution.

## Deployment prerequisites

1. Review the additive Replay event-type migration and existing swarm state/RPC migrations. Rehearse against an isolated database. Do not run Production SQL from this task.
2. Configure `TENENTE_SWARM_CONSOLE_ENABLED=true` only in an approved environment. Tenant binding comes from the authenticated enterprise session, never JSON. Write operations require owner/admin privileges and same-origin requests.
3. Register and enroll the named runtime identities using approved human-origin authority. Assign a named owner and scoped SOC task before investigation. Refresh signed heartbeats and re-register expired authority through the normal governance process.
4. For Copilot, set server-only `OPENAI_API_KEY` and explicit `OPENAI_SOC_MODEL`. Input records are tenant scoped and bounded. Its output must copy exact record fields and cite digests. Usage and latency are recorded per successful run. Cost is `null` without an explicit price schedule; no price or spend is guessed.
5. Validate tenant isolation, replay rejection, policy changes, revocation, approval consumption and provider timeouts in the actual preview environment before enabling response dispatch. Keep uncertain execution UNKNOWN until the independently authenticated observer reconciles it.

## Emergency stop and recovery

An authorized operator activates the existing `contain` command for a swarm. The transaction suspends members, increments credential generations, revokes READY leases, marks in-flight leases UNKNOWN and persists the quarantine. Both admission and dispatch check the same journal state. The fence is effective at the committed containment record; work dispatched before that point may already have reached an external destination. No rollback of external effects is promised.

Recovery requires a different authorized operator and reconciliation of UNKNOWN/DISPATCHED outcomes before scope restoration. Restore members separately, enroll fresh keys, obtain fresh authority/leases and verify runtime heartbeat. Old credentials, approvals and leases must not be reused. Preserve the containment and recovery receipts for Replay. AI-model availability is irrelevant to activation and enforcement.

## Evidence and detection quality

The append-only swarm journal is the causal source. SOC, model, assessment, response, analyst feedback and trust-history records use the same tenant CAS commits; the existing projection recovery writes Replay and Trust Memory after the additive event constraint is installed. Export the full chain, verify its digests and anchor the head outside the writer's control for stronger tamper resistance. Hashes alone do not protect against malicious disk rollback.

Analyst feedback measures reviewed alerts and false-positive fraction among reviewed alerts. That denominator is not all alerts and is not recall. Production recall requires independently labelled ground truth. A synthetic adversarial dataset tests boundary behavior; it does not establish customer detection accuracy.
