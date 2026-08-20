# Cyber Sentinels TypeScript SDK

Experimental SDK v0.1.0 for server-side external agents. It uses Bearer API
keys, exposes ALLOW/REVIEW/DENY without collapsing them, and never executes
customer code. See `/developers/quickstart` in the Cyber Sentinels product for
the complete Agent Gamma flow.

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
    key: "runtime-compatible-provider",
    class: "RUNTIME_SECURITY_PROVIDER",
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

Provider findings are evidence, not Cyber Sentinels decisions. `authorize()`
returns the canonical decision and never executes the customer action.
