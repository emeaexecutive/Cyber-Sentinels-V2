# Cyber Sentinels TypeScript SDK

Status: **UNPUBLISHED, repository-local, Node 22 only**. Do not install this package from a public registry.

Repository-local, unpublished SDK v0.1.0 for server-side external agents. It uses Bearer API
keys, exposes ALLOW/REVIEW/DENY without collapsing them, and never executes
customer code. See `/developers/quickstart` in the Cyber Sentinels product for
the complete Agent Gamma flow.

This package is not published to npm. Inside this repository, install the
example's `file:../../packages/cyber-sentinels-sdk` dependency with
`npm --prefix examples/agent-gamma install`. Do not use
`npm install @cyber-sentinels/sdk` until a real publication is announced.
Public V1 documentation does not declare a standalone SDK download channel;
having the supplied repository is therefore an onboarding prerequisite.

```ts
import { CyberSentinels } from "@cyber-sentinels/sdk";

const cs = new CyberSentinels({
  apiKey: process.env.CYBER_SENTINELS_API_KEY!,
  baseUrl: process.env.CYBER_SENTINELS_BASE_URL!,
  timeoutMs: 10_000,
});

const result = await cs.decisions.create(request);
if (result.decision !== "ALLOW") throw new Error(`Stop execution: ${result.decision}`);

await cs.evidence.submit({
  provider: {
    key: "self",
    class: "APPLICATION_SIGNAL",
    event_id: "runtime-event-001",
    finding: "TOOL_CALL_POLICY_FINDING",
  },
  type: "RUNTIME_SECURITY_OBSERVATION",
  subject: { type: "AI_AGENT", id: request.operational_entity_id },
  evidence: { tool: "mcp:warehouse", observation: "BLOCK" },
});

await cs.outcomes.submit({
  transactionId: result.transaction_id,
  outcome: "SUCCEEDED",
  evidence: {
    destination: "repository:a",
    target: "repository:a",
    reference: "destination:event-001",
  },
});

await cs.agents.authority(request.operational_entity_id);
await cs.transactions.get(result.transaction_id);
await cs.transactions.receipt(result.transaction_id);
await cs.transactions.replay(result.transaction_id);
```

Public evidence submissions are `AGENT_ASSERTED`, not independent provider
findings and not Cyber Sentinels decisions. `authorize()`
returns the canonical decision and never executes the customer action.
The compatibility facades (`agents.register`, `trust.authorize`,
`trust.getTransaction`, `authority.get`) remain available in V1.

Registration creates identity state only. Ed25519 proof may establish current identity, but `VERIFIED` is not independently `AUTHORIZED`; an owner/admin principal must separately grant a bounded, expiring authority version through the governed authority API.

Authority and a prior `ALLOW` are never permanent facts. A later consequential action needs a new decision and idempotency key. Use `context.previous_transaction_id` only to compare T2 with T1, and optionally pin the expected `authority_version`/`policy_version`; those client values are not proof. Inspect `result.consequence_time` for the exact intent, server-resolved current conditions, consequence, historical comparison, and the invariant `previous_allow_standing_authorization: false`.

## Errors, cancellation, and rate limits

The SDK exports `AuthenticationError`, `PermissionDeniedError`, `ConflictError`, `RateLimitError`, `ServerError`, `TimeoutError`, and the base `CyberSentinelsError`. Safe errors expose `code`, HTTP `status`, `correlationId`, and (for 429) `retryAfter`. They never contain the API key.

```ts
import { CyberSentinelsError, RateLimitError } from "@cyber-sentinels/sdk";

const controller = new AbortController();
try {
  const result = await cs.decisions.create(request, {
    signal: controller.signal,
    timeoutMs: 5_000,
    onResponse(meta) {
      console.log({ status: meta.status, remaining: meta.rateLimit.remaining, resetAt: meta.rateLimit.resetAt });
    },
  });
  if (result.decision !== "ALLOW") throw new Error(`Stop execution: ${result.decision}`);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Honor error.retryAfter, then retry with bounded backoff.
  } else if (error instanceof CyberSentinelsError) {
    // Log only error.code and error.correlationId.
  }
  throw error;
}
```

For a timed-out decision, retry the unchanged request with the same idempotency key. DNS failure, timeout, 429, 500, and 503 are unavailable states, never `ALLOW`. `REVIEW` is a completed decision but does not permit execution. An approved governed review is subsequent evidence and still requires a new canonical evaluation under current conditions.
