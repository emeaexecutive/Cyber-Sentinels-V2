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
```
