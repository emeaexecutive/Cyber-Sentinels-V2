# Cyber Sentinels TypeScript SDK

Repository-local, unpublished SDK v0.1.0 for server-side external agents. It uses Bearer API
keys, exposes ALLOW/REVIEW/DENY without collapsing them, and never executes
customer code. See `/developers/quickstart` in the Cyber Sentinels product for
the complete Agent Gamma flow.

This package is not published to npm. Inside this repository, install the
example's `file:../../packages/cyber-sentinels-sdk` dependency with
`npm --prefix examples/agent-gamma install`. Do not use
`npm install @cyber-sentinels/sdk` until a real publication is announced.

```ts
import { CyberSentinels } from "@cyber-sentinels/sdk";

const cs = new CyberSentinels({
  apiKey: process.env.CYBER_SENTINELS_API_KEY!,
  baseUrl: process.env.CYBER_SENTINELS_BASE_URL,
});

const result = await cs.trust.authorize(request);
if (result.decision !== "ALLOW") {
  // The caller decides whether to stop or enter a review workflow.
}

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

await cs.authority.get(request.operational_entity_id);
await cs.trust.getTransaction(result.transaction_id);
await cs.trust.getReceipt(result.transaction_id);
```

Public evidence submissions are `AGENT_ASSERTED`, not independent provider
findings and not Cyber Sentinels decisions. `authorize()`
returns the canonical decision and never executes the customer action.
