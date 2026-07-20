# Provider Consensus Engine

The engine treats trust as operational architecture: designed, tested, maintained and made transparent. This aligns with the broader industry framing in [Why Trust Architecture Could Be The Next Big Competitive Edge In Business](https://www.forbes.com/councils/forbesbusinesscouncil/2026/03/25/why-trust-architecture-could-be-the-next-big-competitive-edge-in-business/), while Cyber Sentinels' implementation remains grounded in auditable repository behavior.

```text
normalized observations
→ capability eligibility
→ signature/server-verification checks
→ freshness and provider health
→ independence/correlation controls
→ conflict analysis
→ versioned policy thresholds
→ trust state + confidence + reason codes
→ hashed decision lineage + canonical Trust Events
```

Confidence is bounded from 0–100 and is not probability or certainty. Evaluation ordering and hashing are deterministic. Identical subject, workflow, policy and evidence snapshots produce one idempotency key and one decision identifier. The database serializes evaluation per enterprise/subject/workflow and returns the existing decision on retries.

`consensus_decisions` is the audit source. `subject_trust_state` is a replaceable materialized current view. Historical replay resolves the policy, observations and health that existed at the requested timestamp; simulation can exclude evidence, override policy or model provider outages without writing state.
