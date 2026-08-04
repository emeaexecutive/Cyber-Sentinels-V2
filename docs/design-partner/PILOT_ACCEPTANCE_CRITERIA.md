# Pilot acceptance criteria

- One verified human is represented in the decision context.
- One registered agent is evaluated through the design-partner engine.
- One accountable owner and operator are bound to the agent.
- One scoped authority grant is evaluated with expiry and resource scope.
- One high-risk action request is evaluated with allow/review/deny outcomes.
- The authenticated actor must be the accountable owner or operator; otherwise the decision is routed to review rather than proceeding.
- Provider unavailability is handled as fail-closed and does not fabricate a live outcome.
- Idempotency rejects changed retries while preserving the original decision.
- Human review remains a required path for review outcomes.
- Append-only evidence and replay context are preserved in the bounded engine model.
- Tenant isolation is preserved by the tenant and enterprise checks in the engine.
