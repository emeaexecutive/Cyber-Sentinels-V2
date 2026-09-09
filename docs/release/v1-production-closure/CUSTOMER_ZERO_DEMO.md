# Customer Zero — factual Production demonstration

On 9 September 2026, a clearly identified Customer Zero agent used an external HTTP client to request permission to read `repository:customer-zero-v1-release-evidence` for deployment evidence review.

Cyber Sentinels verified possession of the agent's external Ed25519 key. An authorized tenant administrator, acting through a bounded API client, granted narrow read authority for that resource and purpose.

The first decision was **REVIEW**, transaction `a389359e-febd-5e99-ac2f-3e0b141d2399`. The authority scope was valid, but required verified configuration and monitoring evidence was missing. Cyber Sentinels retained that evidence gap, the decision, a receipt and Replay.

The authority was then revoked at `2026-09-09T09:18:29.365461+00:00`. The same agent requested the same action again. Its identity remained VERIFIED, but the new decision was **DENY**, transaction `522ec390-4bc6-5b62-9830-553a0498248c`, with `AUTHORITY_REVOKED` and `CONTRACT_REVOKED` among the reasons.

Replay and Trust Memory retain both decisions and their authority linkage. A subsequent supported outcome review recorded a controlled DENY adjudication while preserving the original REVIEW decision, digest and reason codes.

This run demonstrates withheld authorization, identity/authority separation, revocation, and persisted decision evidence. It does **not** yet demonstrate the required authorized ALLOW → revoke → DENY lifecycle. Production remains NO-GO for V1 closure because the required configuration/monitoring evidence producer is only implemented for synthetic Staging.

The client was scripted. No AI model, real customer, latency result, provider success, or downstream repository operation is claimed.
