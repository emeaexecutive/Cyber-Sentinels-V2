# TENENTE Swarm — capability maturity matrix (21 October 2026)

Baseline: PR #118 head `f144fd079043c72c981a3a29e029cad39e89a3cc` (draft). Canonical product definition: [docs/product/TENENTE_PRODUCT_DEFINITION.md](../product/TENENTE_PRODUCT_DEFINITION.md). TENENTE is the product direction within Cyber Sentinels, not a separate platform, repository, company or database.

Levels: **D** designed · **I** implemented · **L** locally tested · **DB** tested against real PostgreSQL · **H** hosted-Staging tested · **P** Production-qualified.

No capability below is Production-qualified. No Swarm capability has hosted-Staging evidence at this SHA. Evidence sources are the repository's own reconciliation and qualification reports under `docs/swarm-authority/`; "DB" means the local PostgreSQL 17 runs recorded there, not hosted Supabase.

| Capability | D | I | L | DB | H | P | Notes / gap |
|---|---|---|---|---|---|---|---|
| Agent identity (Ed25519 credential proof) | ✔ | ✔ | ✔ | – | – | – | Identity does not imply permission (tested). |
| Delegation subset (actions, tools, targets, environments, boundary, limits, expiry, depth) | ✔ | ✔ | ✔ | – | – | – | Now also covered by seeded property tests (`tests/swarm-delegation-properties.test.mjs`). |
| Signed delegation and acceptance | ✔ | ✔ | ✔ | – | – | – | Key ownership/rotation procedure needs a documented owner. |
| Parent revocation cascades to descendants | ✔ | ✔ | ✔ | partial | – | – | Hosted cascade under concurrency not proven. |
| Cross-tenant denial | ✔ | ✔ | ✔ | ✔ (RLS) | – | – | Hosted RLS qualification outstanding. |
| ALLOW / REVIEW / DENY via the existing gateway | ✔ | ✔ | ✔ | – | historical only | – | REVIEW never becomes ALLOW (existing gateway tests). |
| Audience and purpose restrictions on delegations | ✔ | – | – | – | – | – | **Gap:** scope has no audience or purpose field. Requires a schema/signing-format change; not done here. |
| Enterprise context (facts, provenance, freshness, tenant, integrity) | ✔ | ✔ | ✔ | – | – | – | New `lib/swarm/enterprise-context.ts`; pure and optional, not yet wired into the gateway. |
| Budget reservation and concurrent exhaustion | ✔ | ✔ | ✔ | ✔ | – | – | Local PostgreSQL runs only. |
| Signed containment commands | ✔ | ✔ | ✔ | ✔ | – | – | |
| First-party HTTP/MCP cancellation, durable acknowledgement, reconciliation | ✔ | ✔ | ✔ | ✔ | – | – | Third-party cancellation is unsupported. |
| Remote effect verification | ✔ | partial | partial | – | – | – | Outcome `unknown` must remain a first-class state. |
| Evidence receipts, Replay, Trust Memory™ projection | ✔ | ✔ | ✔ | ✔ | – | – | Tamper-evident, not "immutable". |
| Real external tool enforcement | ✔ | loopback only | ✔ | – | – | – | Loopback HTTP/MCP proves the boundary locally. A mocked tool is not proof of enforcement at a real provider. |
| Runtime attestation | ✔ | declaration only | ✔ | – | – | – | Signed declaration is not independent attestation. |

## Prioritised gaps

1. **Hosted Staging qualification** (needs specific approval): signed cancel → remote acknowledgement → independently verified effect, against one disposable first-party tool with synthetic data.
2. **Audience/purpose** in delegation scope (signing-format and schema change; separate reviewed PR).
3. **Wire enterprise context** into the authority decision behind an opt-in flag.
4. Crash/restart and lost-acknowledgement scenarios against hosted infrastructure.
5. Key ownership, rotation and replay-resistance runbook sign-off.

## Added in this change

- `lib/swarm/enterprise-context.ts`: trusted-source and integrity checks, tenant isolation, freshness, contradiction handling. Outcomes are `SATISFIED`, `INSUFFICIENT_EVIDENCE`, `REVIEW_REQUIRED` and `CONFIRMED_DENY`. Context never grants authority; it can only keep or lower a decision, and insufficient evidence defaults to DENY.
- `tests/swarm-delegation-properties.test.mjs`: 300-seed deterministic property tests (transitive attenuation, single-field escalation, depth bounds).
- `tests/swarm-enterprise-context.test.mjs`: negative tests for LLM/inferred/unverified sources, tampering, staleness, cross-tenant facts and contradictions.
- Both suites are registered in `npm run test:swarm-authority`.
