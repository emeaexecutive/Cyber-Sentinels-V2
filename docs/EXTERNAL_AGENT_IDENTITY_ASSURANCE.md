# External Agent Identity Assurance

## Boundary

Cyber Sentinels treats external-agent identity evidence as a supporting signal, not as the final authority for execution.

- Provider-backed identity evidence can establish that an external agent presents a recognized principal.
- Cyber Sentinels still evaluates whether the agent has a current, non-revoked authority grant for the requested action.
- Identity mismatches, revoked provider lifecycle states, and expired or revoked authority all require review or denial.

## Supported outcomes

The current implementation exposes a focused assurance result with four states:

- `verified`: identity evidence is present and authority is current.
- `review_required`: identity evidence exists but authority is expired/revoked or the provider evidence is unavailable.
- `mismatch`: provider evidence names a different principal than expected.
- `revoked`: the provider identity lifecycle is inactive, suspended, deactivated, or deleted.

## Truthful positioning

This boundary remains intentionally narrow. Cyber Sentinels does not attempt to become a full identity-provider or IAM platform. It preserves provider-neutral evidence, keeps authority evaluation authoritative, and ensures that provider evidence cannot silently authorize a workflow.
