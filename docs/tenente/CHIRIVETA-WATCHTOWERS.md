# CHIRIVETA — bounded containment review

Status: local synthetic implementation, PARTIAL qualification. No hosted rollout, real AI inference or Production containment is established by this work.

Review base: the already published `feat/tenente-swarm-authority-control` at `f144fd079043c72c981a3a29e029cad39e89a3cc`. The existing local `agent-message.ts`, `file-persistence.ts` and transactional `store.ts` snapshots are reused verbatim from TENENTE `b7891662ff98de1d14bfe514a08bd85fcb97a2dd`, without importing that branch's historical artifacts. No scanner configuration or exclusion changes are included. The earlier unpublished review base is retained locally only; it must not be introduced into remote all-branch CI scans.

The older base's vulnerable runtime dependency pins are patched to the already qualified Next.js/eslint-config-next15.5.28, sharp0.35.5 and source-map-js1.2.2. The lockfile is regenerated without install scripts. Production dependency audit reports zero vulnerabilities; exact-head full CI remains required. No audit suppression or forced automatic major upgrade is used.

ALSAMORA originates a signed warning; VIACAMP verifies and relays it; CHIRIVETA reviews it. The original ALSAMORA event ID, source signature and payload are immutable. Each relay signs the complete preceding envelope. Existing Ed25519 agent-message verification enforces the registered tenant, runtime key version, audience, payload digest and a maximum thirty-second lifetime. Existing SwarmStore transactions and Replay hashes persist acceptance, denial and origin-ID deduplication. Different valid relays can preserve the same origin without opening a second investigation. A relay nonce cannot be reused as a fresh message.

The fixture uses the existing independently managed registry/key-enrolment methods and existing file-backed CAS persistence. Separate store instances arbitrate replay through durable snapshots, not an in-memory lock. File hashes detect corruption, not malicious filesystem rollback: a hosted service needs qualified transactional RPC persistence and externally anchored evidence heads. No new hosted warning endpoint is exposed. A future ingress must authenticate its caller, validate and bound its JSON envelope, enforce rate limits and qualify revocation/credential lifecycle before accepting untrusted network traffic.

CHIRIVETA may reject an unsupported proposal, recommend investigation, request an exact temporary reversible block within current delegated scope, or recommend a narrowly targeted destructive action for independent human approval. It may request revocation/isolation through an authorised first-party gateway. Its recommendation is advisory or an additional veto, never a grant. It cannot mint authority, widen a tenant/resource scope, approve its own destructive action, override policy, or act against infrastructure outside the tenant's legitimate administration.

The local reviewer is deterministic fixture logic, not a connected AI model. A future model response must remain untrusted structured advice. A veto may restrict an action; no model result may turn REVIEW/DENY into permission. No prompt, retrieved document or warning can supply a trusted grant or human approval.

## Independent execution dependency

River proof is a separate PR stacked on PR132 (`ad4a0e907a48bdb687351672355cddc5e74e2c00`), which includes PR131's dispatcher. It uses the existing policy function, native dispatcher and atomic SQL. The controlled loopback destination requires a gateway proof and a committed exact-scope dispatch claim; independent database queries inspect actual synthetic effects. No root TENENTE dispatcher or P0 branch was modified to integrate this work. Torch and River are separately qualified local boundaries; a combined hosted flow is BLOCKED, not claimed as working.

## Qualification truth

| Capability | Status | Evidence / limit |
|---|---|---|
| Enrolled-key warning authentication and relay integrity | WORKING locally | Actual existing Ed25519 verifier; synthetic registered principals |
| Freshness, replay, duplicate-origin and rejection Replay | WORKING locally | Deterministic tests and independent durable store instances |
| Human Auth / tenant onboarding in a hosted deployment | BLOCKED | Requires authorised isolated Staging bindings and fixtures |
| AI threat assessment | MOCKED | Deterministic demonstration advice; no model/provider |
| River exact-action enforcement and destination outcomes | PARTIAL | Separate local PostgreSQL/HTTP proof; minimal predecessor schema |
| Hosted Registry / Authority Graph / Evidence Vault / Trust Memory integration | BLOCKED | No new integration deployment or migration authorised |
| Historical photograph publication | BLOCKED | Founder credit and publication rights not confirmed; image omitted |

## Staging sequence — prepared, not executed

1. Preserve the website release and PR131/132; reconcile Staging drift and rehearse the full schema separately.
2. Verify Staging project `agpyhygpfmppjkxwcpac`, Auth, RLS, runtime keys, storage, secret isolation, backup/recovery and non-production provider settings read-only.
3. Obtain separate approval for branch-specific bindings, any named migrations, and bounded synthetic hosted fixtures/writes. Never use Production or real money.
4. Register the three test agents through the existing authenticated registry. Issue human-origin scoped authority through the existing graph; an origin warning confers none.
5. Run Torch A–F, altered/expired/forged/tenant/nonce/credential cases and concurrent duplicate delivery with persisted evidence.
6. Run River A–G at the actual controlled destination, including policy/target/expiry changes, revocation immediately before dispatch, twelve request keys and lost acknowledgements. Count independent destination effects; do not infer them from ALLOW/DENY.
7. Verify Replay links for detection, relay, reviewer advice, identities, grant lineage, policy, approval, action digest, dispatch claim, destination observation and reconciliation. Verify signatures against separately pinned environment keys.
8. Record exact SHA, project ref, deployment/gateway identity, run IDs and evidence heads. Remove synthetic fixtures only under their authorised cleanup plan. Seek a separate release decision.

The public website is an ILLUSTRATIVE SIMULATION replaying local fixture summaries; its buttons do not call execution APIs. Public diagrams are original illustrations. Founder heritage-panel links are attributed and reconstructed; torch codes are fictional. Original photographs are excluded until credit and publication rights are confirmed.
