# Validation and Signal Testing

Cyber Sentinels validation is designed to measure workflow trust signals without inventing accuracy metrics or claiming biometric, liveness, deepfake or provider superiority.

## What Is Tested

The admin validation lab tests controlled scenarios:

- verified human
- synthetic identity
- VPN session
- injected session
- proxy interview
- missing evidence
- failed provider signal
- governance escalation

Each scenario reports:

- identity confidence
- provider verification state
- session integrity
- behavioral consistency
- evidence completeness
- governance review state
- score contribution
- triggered flags
- escalation reasons
- workflow outcome

## What Is Provider-Backed

Provider-backed evidence can include:

- provider success or failure
- verification latency
- provider confidence
- missing provider evidence

Provider evidence is a signal for workflow review. It does not approve, reject or authenticate a workflow by itself. Provider secrets are never shown in the validation UI.

## What Is Rule-Based

The current signal engine is deterministic and rule-based. It uses the transparent trust score model plus normalized provider signals to explain:

- score contribution by category
- risk flags
- governance escalation
- evidence generated
- replay validation fields

This is not a trained biometric model, deepfake model, liveness model or voice-clone model.

## Replay Validation

Replay validation should show:

- what triggered
- why it triggered
- evidence used
- reviewer actions
- trust score changes

Replay validation exists so reviewers can inspect why the workflow state changed and what evidence was available at the time.

## What Still Requires Benchmarking

Cyber Sentinels should not claim independent accuracy until future benchmarking exists for:

- biometric verification
- deepfake detection
- liveness detection
- voice-clone detection
- proxy interview detection
- synthetic identity detection

Future benchmarks must define dataset source, sample size, environment, provider version, decision threshold, false positive rate, false negative rate and reviewer protocol.

## Future Validation Roadmap

Future validation work should add:

- persisted validation run history when a storage model is approved
- provider-specific latency distributions
- provider error taxonomy
- reviewer override tracking
- false positive and false negative review workflow
- test fixtures for seeded demo workspaces
- benchmark import support for independent provider reports

Until then, the admin test lab should remain a measurable scenario framework, not a claims engine.
