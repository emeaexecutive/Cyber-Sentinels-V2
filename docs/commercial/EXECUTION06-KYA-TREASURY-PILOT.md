# Execution06 KYA / treasury design-partner pilot

Draft for review,15 November2026. No customer interest, partnership, certification, exclusivity or Production readiness is claimed. No outreach, contract or charge was sent.

**KYC verifies the customer. KYA verifies the agent. Cyber Sentinels verifies the authority to act — and proves what actually happened.**

## Proposition and buyer

Test whether financial agents can act inside explicit authority and spending limits, while producing evidence a separate reviewer can verify. The current deliverable is a local synthetic technical demonstration with real cryptographic checks, file-CAS destination commitment and independent ledger observation. Human identity/session/authority enrollment uses declared fixtures. Hosted KYA, financial provider integration and protected console wiring remain incomplete.

| Buyer | Discovery focus / measurable outcome |
|---|---|
| CISO | Can a compromised or revoked agent execute? Zero prohibited synthetic effects and independently verified evidence |
| CTO | Where does current authority meet destination commitment? Reproducible integration and race tests without a duplicate identity database |
| Treasurer | Who approved the beneficiary, amount and shared exposure? Exact-action dual approval and ceilings across agents |
| Head of Payments | What happens after a timeout or duplicate request? One synthetic effect, safe UNKNOWN reconciliation and no blind retry |
| Digital Asset Security | Who controls signing, network, contract and wallet? Current prototype binds fields only; real custody and simulation require separate design |

## Architecture and integration

Reuse existing enrolled agent keys, accountable principal references, Authority Graph, SWARM CAS and Replay. A proposal is Ed25519-signed; the server revalidates identity, authority, policy, current approvals and shared exposure. A short-lived opaque mandate names server state. The controlled local destination repeats checks and atomically consumes the mandate with its synthetic ledger effect. Signed exports bind the Replay head/count and effect digest.

Run npm run test:treasury and npm run demo:treasury. Local contract: docs/api/treasury-sandbox.openapi.json. Client: examples/treasury-sandbox/client.mjs. It rejects non-loopback provider URLs. Hosted workload decision APIs remain decision-only; no new public payment endpoint or token-provider adapter is advertised.

30minute review:0–5 scope/fixtures/enforcement boundary;5–12 EUR50,000 ALLOW and separate destination read;12–18 REVIEW and two-person approval;18–23 revocation/substitution DENY;23–27 shared final-allowance race and timeout reconciliation;27–30 independent export verification and limitations. Local bilingual console can be held open with node --import tsx tools/treasury/demo.mjs --serve.

## Pilot terms and success criteria — hypotheses, not offers

Propose a4–6week synthetic design-partner engagement, one tenant, one controlled destination, one currency/asset budget, named human policy owners and no customer data/live funds. Test a EUR5,000–15,000 fixed-fee hypothesis through discovery; no validated willingness to pay or approved commercial terms exist. Any contract, scope expansion, provider access, live charges or real transactions need separate approval.

Acceptance: all mandatory negative cases denied; zero over-limit/substituted/revoked effects; at most one effect per mandate under independent-writer races; two current independent approvers for high consequence; unknown outcomes reconciled from destination evidence; forged/truncated exports rejected with pinned anchors; EN/ES local-console parity. Measure latency and operator effort during the pilot rather than promise unmeasured targets. Agree retention, deletion, incident ownership and stop procedures before hosted writes.

Ask buyers: which gateway can actually refuse commitment? Which principals own risk and approval? How are aggregate budgets shared today? What evidence settles disputes? Which identity/fraud providers must be trusted? What must remain under human control? Which latency/availability limits matter? What would make this pilot fail?

## Sourced competitive comparison

Checked15 November2026. These are documented vendor claims, not independent product tests. Absence from a source is not proof a competitor lacks a capability.

| Provider | Documented capability | What remains unassessed here |
|---|---|---|
| [Experian Agent Trust](https://www.experian.com/business/products/agent-trust) | Human-to-agent binding, KYA trust tokens and identity/intent/risk validation | Actual contracts, token verification, destination enforcement and independent comparisons |
| [Ravelin](https://www.ravelin.com/agentic-ai-fraud-detection-ecommerce) | Agent/bot detection and transaction/refund fraud signals | Our access, integration behavior and treasury-control equivalence |
| [Skyfire KYAPay](https://kyapay.org/whitepaper) | Identity-linked payment tokens and agent checkout | Provider contract, settlement and sandbox integration. [Token draft](https://datatracker.ietf.org/doc/draft-skyfire-oauth-kyapay-token/) is work in progress |
| [Persona](https://help.withpersona.com/articles/CmxigxTOZVhlr4bn7xSX9S/) | KYA inputs linking agent requests to human presence, eligibility and identity proofing | Integrated payment authority and our specific assurance contract |
| [Visa TAP](https://developer.visa.com/docs/trusted-agent-protocol/trusted-agent-protocol-specifications) | Cryptographic request recognition using HTTP message signatures | Payment authority, our enrollment/integration and conformance |
| [Mastercard Agent Pay](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html) | Registered agents and tokenized agentic payments | Contractual access, supported pilot routes, our implementation and settlement guarantees |
| [HUMAN agentic commerce](https://www.humansecurity.com/learn/resources/agentic-commerce/) | Agentic traffic visibility/control positioning | Technical API access and financial gateway enforcement |
| Cyber Sentinels current prototype | Reuses existing authority/enforcement/Replay for a tested synthetic destination; signed evidence and fail-closed races | Complete real-principal KYA, hosted enforcement, managed recovery, AML, providers, protected bilingual UX and Production readiness |

A defensible proposed differentiator is independently demonstrable authority-to-effect evidence at a controlled boundary. This remains a proposition to validate, not a claim to be first, best or universally compliant. KYA terminology is not exclusive intellectual property.

