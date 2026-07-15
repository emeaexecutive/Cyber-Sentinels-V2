# Provider Consensus Framework

Provider consensus is an explainable evidence framework, not an integration catalogue and not a final decision engine.

## Supported signal categories

- identity;
- deepfake;
- device integrity;
- session integrity;
- liveness;
- voice;
- document verification;
- behavioral analytics.

Every normalized contribution records provider, category, runtime state, support/challenge/unknown direction, model, version, latency, confidence, category weight, state weight, reliability weight, limitations and evidence references.

## Runtime-state treatment

`Live` signals can contribute at full state weight. `Test Mode`, `Simulated` and `Degraded` contributions are explicitly discounted. `Awaiting Credentials`, `Timeout`, `Failed`, `Disabled` and `Unsupported` states contribute no confidence.

Category weights prevent unrelated signals from being treated as interchangeable. Provider reliability and runtime state remain visible in every contribution.

## Consensus rules

1. Fewer than two independent signal categories produces `insufficient_evidence`.
2. Strong support and challenge contributions produce `conflict` and require policy or human review.
3. Otherwise the framework returns `support` or `challenge` with separate trust and consensus confidence.
4. Missing model/version metadata and every provider limitation remain in the result.
5. Provider evidence supports the Trust Engine; it does not authorize execution or determine the final decision.

The framework never blindly averages provider confidence. Its contribution trace explains which provider/category affected the outcome and why.
