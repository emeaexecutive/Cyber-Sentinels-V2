# Execution06 continuous KYA architecture

TrackB source **189601d51392447ef54e992a1fda088d508330b3**, separate from TrackA17055a0. Stages: IDENTIFY → VERIFY → AUTHORISE → ENFORCE → PROVE. No duplicate identity database was introduced.

Existing enrolled SWARM members/runtime keys and accountable collective principal feed Ed25519 payment proof-of-possession. Existing Authority Graph validates current server-owned tenant/action/resource/purpose/root authority. Existing SWARM CAS stores financial policy, approvals, short-lived mandates, destination effects and hash-linked events together. Existing authority-receipt signing authenticates evidence, not bearer permission. Mandates are opaque references to server-side action-bound state. Authorization and destination commit recheck identity, authority, policy, current approvers and exposure.

| Capability | Status |
|---|---|
| Cryptographic agent proof / enrolled key / key-rotation rejection | WORKING LOCAL; ephemeral fixture key enrollment |
| Verified human/business principal and agent passport | MOCKED / PARTIAL; existing accountable principal references reused; no real KYC/KYB or complete passport UX |
| Scoped/depth-limited authority graph | Existing primitive WORKING; synthetic financial resolver uses declared test grants. Hosted authority loading/signature chain orchestration remains PARTIAL |
| Continuous execution checks / single-use short-lived mandate | WORKING at controlled local destination; CAS retry closes tested revocation race |
| Revocation / emergency stop | WORKING LOCAL before commit. No reversal claim after settled effect |
| Status/history / financial signals | WORKING LOCAL deterministic advisory views; no autonomous financial intervention |
| Signed decisions / receipts / independent Replay export | WORKING LOCAL with independently pinned public key and checkpoint; managed Evidence Vault projection NOT WIRED |
| Cross-provider support | PARTIAL: shared policy across synthetic provider labels; no real provider adapters |
| Verification API/SDK | Existing workload API security corrected. New financial API/SDK is loopback sandbox-only; hosted public KYA/financial endpoints NOT BUILT |
| Protected SaaS console integration | PARTIAL: separate local Trust Operations sandbox console; not integrated into authenticated hosted console |

Server binds127.0.0.1 and rejects cross-origin POSTs; request bodies are capped16KiB. Fixture human sessions are not Production authentication. The HTTP sandbox clock advances in real time; deterministic negative tests use an injected clock. No private signing key is exported. The sandbox does not replace the canonical native provider-enforcement path. Per-delegation financial attenuation beyond the shared policy, real Registry/authority loading and hosted gateway wiring remain incomplete.

## Interoperability research, checked15 November2026

- [AuthZEN specifications](https://openid.net/wg/authzen/specifications/): Authorization API1.0 is final; a future PDP/PEP adapter needs conformance evidence and explicit REVIEW handling. No AuthZEN compliance claimed.
- [MCP authorization specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/index.mdx): authorization transport is not financial authority; pinned scopes/resource binding still require enforcement.
- [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md): describes linked checkout/payment mandates and receipts. The local Ed25519 envelope is NOT an AP2 implementation; no AP2 checkout or payment adapter exists.
- [Visa TAP specifications](https://developer.visa.com/docs/trusted-agent-protocol/trusted-agent-protocol-specifications): request recognition uses HTTP message signatures. Recognition alone does not grant treasury authority; no Visa integration or partnership claimed.
- [Web Bot Auth draft](https://datatracker.ietf.org/doc/html/draft-ietf-webbotauth-httpsig-protocol-00) and [Cloudflare implementation](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/): version-dependent authentication; no conformance claim.
- [KYAPay token draft](https://datatracker.ietf.org/doc/draft-skyfire-oauth-kyapay-token/): work in progress. No token/provider adapter is implemented without an agreed testable contract.

