# CPTO qualification ? 20 October 2026

> Subsequent first-party cancellation authorization and implementation: [cancellation qualification](CANCELLATION-QUALIFICATION-20261020.md). The delivery gap recorded below describes this report's earlier candidate.

This is the follow-up to `CONTRACT-QUALIFICATION-20261020.md`, not a replacement for its historical evidence. The source commit containing this report identifies the candidate. No hosted swarm qualification or Production GO is asserted.

## A. Preserved baseline and branches

The existing implementation `c52326d00687b04d13c32d7578dc5df379f89412` and its parent chain were verified locally and pushed without force on `feat/tenente-swarm-authority-control`. Frozen Core RC `5e7b9ed8670f87b8df5884f5c880660125fc4be7` is unchanged. Integration branch ancestor: `1138150889ec1237a848073f352881d93b72484b`. Commit `b0bcf7ba202d0a426355576265befe0abc3fa270` disables automatic Vercel deployment for the swarm branch before pushing. The draft PR targets the integration branch, not main.

The pre-existing About story was preserved and extended with its requested anchor/link. The unrelated dirty migration-reconciliation report and historical untracked operations evidence were preserved, not swept into this change.

## B. Existing and new implementation

Existing: canonical Gateway/Authority Graph restrictions, CAS budget reservations, task dependencies, REVIEW/DENY blocking, HTTP/MCP enforcement, parent revocation, tenant containment, immutable journal, Replay/Memory projections and authenticated console.

New: independently enrolled Ed25519 runtime keys, signed monotonic tenant/audience/generation-bound heartbeats through the existing V1 agent endpoint and SDK; durable operator provisioning and independent restoration; traffic-triggered projection recovery with a service-only SQL cursor; trusted task-component classification; signed, nonce-protected, expiring scoped containment; coordinated-denial alerts in the console; operator public trust-anchor configuration; honest website availability labels. No private signing keys are exposed or stored by the console.

## C. Acceptance and regressions

The original 32-requirement and twelve-adversarial mapping remains in `ACCEPTANCE-32-20261020.md`. These are behavioral requirements grouped into tests, not 44 independently deployed features. Full regression baseline: 2,248 passed, zero failed/skipped. Final focused/lint/typecheck/build outcomes and source hashes are recorded in the companion evidence manifest. A concurrent validation attempt hit a 20-second HTTP-test timeout under resource contention; its log is retained. Test files now run sequentially; each budget test still explicitly starts five agents concurrently.

## D/G. Five-agent budget and transports

Real PostgreSQL 17.11, twelve independent pool connections, actual SQL migrations and controlled loopback HTTP/MCP adapters were used. Each transport: peak parallelism 5; downstream requests 6 (five initial requests including one verified zero-effect failure, plus one permitted retry); committed spend 50,000 EUR minor units; zero overspend; duplicate/overflow attempts add no calls; parent revocation blocks all five descendants with **zero** new calls. Each transport persisted one state and 38 journal receipts. A fresh unused-budget probe separates revocation enforcement from budget exhaustion. Amounts are simulated; no real money or commercial-provider execution occurred.

## E. SI/ASI Prevention Kit

Ed25519 commands verify pinned current issuer authority, tenant, swarm, target, expiry (maximum 60 seconds), signature and atomic single-use nonce. OBSERVE grants nothing; REVIEW/DENY/QUARANTINE/REVOKE/EMERGENCY_STOP block controlled execution. Signed parent revocation expands to descendants. Forgery, expired/future commands, revoked keys, foreign tenants/swarm, compromised orchestrators and simultaneous replay are rejected. Gateway credential generations and queued leases are invalidated; dispatched outcomes remain UNKNOWN and retain reservations.

Delivery adapters distinguish requested/partial/unsupported/unknown cancellation. Lost delivery never reopens the gateway. **Actual cooperating-runtime delivery and cancellation are not yet wired to an approved runtime endpoint.** No remote-process shutdown, external credential rotation or universal rogue-intent detection is claimed. Anomalies are derived from durable denial receipts and displayed with evidence references; automated escalation remains an operator decision.

## F/H. Database, RLS, receipts and recovery

New forward-only migration: `20261020100706_tenente_swarm_projection_recovery.sql`; original swarm migration is unchanged. Disposable PostgreSQL tests verify service-only cursor access, monotonic/bounded updates, tenant separation and denial for anon/authenticated roles. Local canonical Replay/Memory tests verify persistence, idempotency and journal tamper rejection. Projection cursor advances only after a contiguous batch succeeds. Execution and operator traffic trigger recovery; there is no independent scheduled background worker yet.

The original 12 October Production archive remains unchanged: SHA-256 `081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307`, 4,103,536 bytes. Its earlier isolated restore established 284 table identities, 11,133 physical rows and all table fingerprints. Those results were read and preserved; no redundant Production backup was taken. This eight-day-old point is not a fresh release recovery point. The separate 17,504-byte Storage payload was independently rehashed this run to `bdf014e1c83eec26e1fccf73231b500620c5deed0d98b80079b5bc011ad31b92`. Separate Storage evidence does not prove a synchronized database/Storage snapshot. Cluster passwords, infrastructure configuration, project secrets and external state require separate recovery arrangements. Historical verify-full pooler transport evidence does not establish TLS on the pooler-to-database hop.

## I. Console

Authenticated tenant-bound, same-origin, no-store operator API supports containment, descendant revocation, reconciliation, independent restoration, immutable membership/task provisioning, runtime public-key enrollment and signed commands. It displays budgets, membership, task relationships, recent receipts and coordinated-denial alerts. Local route tests exercise auth/tenant restrictions and side effects. Provisioning currently uses a JSON editor; complete hosted operator usability and fresh-key/recovery journeys are not qualified.

## J. PR dispositions

See `PR-DISPOSITION-20261020.md`. Qualified tooling changes are merged individually. Release-sensitive and failing dependency upgrades remain blocked; count reduction is not a release criterion.

## K/L. Website and historical inventory

See `WEBSITE-AUDIT-20261020.md` and `CAPABILITY-RECONCILIATION-20261020.md`. Our Story preserves the approved Arag?n wording and bounded delegated-guardianship inspiration. Platform links technical capabilities and explicitly labels availability/qualification. No legitimate capability pages were removed. No historical capability is newly asserted PROVEN_PRODUCTION.

## M/N. Hosted state and mutation accounting

Read-only Vercel evidence: Production aliases serve `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571` (`dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`); Staging serves `ce2a28f7abbc3d45464f511e3119342b80280533` (`dpl_72j6dXKotUobQrJ6UxV6Zpo18QNv`). Neither is this swarm candidate. The prior hosted Turnstile/login failure and pending-approval journey were not requalified in this run; no new human challenge or Cloudflare analytics PASS is asserted.

Explicit read-only database transactions: Production project `kecgtsfibkypjuaxqbjx`, 119 migrations, latest 202610020001; Staging `agpyhygpfmppjkxwcpac`, 151, latest 20261012122704. Approval/session migrations exist only on Staging; neither hosted project has either swarm migration. Same migration names are not claimed to prove full schema equivalence.

Production administrative database/account/API-key/configuration/migration/deployment changes: **0**. Public screenshot capture clicked Reject Optional on ephemeral browser contexts, which initiates a consent-receipt POST; the UI showed synchronization pending. Its eventual persistence was not captured. Consequently an absolute zero count of all application-level Production writes is **not established**. This incidental interaction is disclosed, not treated as a verified read-only browser audit. Further captures block all non-GET hosted requests. No authenticated login, account changes or release promotion were performed.

## O/P. Delivery and release prerequisites

The evidence manifest lists changed-source hashes and logs. The swarm branch is pushed and a draft integration PR is prepared; #116 and swarm release work are not merged.

Remaining engineering: approved cooperating-runtime delivery/ack integration, scheduled projection/lifecycle recovery if required for inactive tenants, full authenticated console journey and hosted adapter/signing qualification. Staging needs a separately approved window for the exact candidate, two forward migrations with prerequisite checks, environment-bound keys/flags, synthetic fixtures and cleanup. Production additionally needs a fresh approved recovery point, Storage consistency plan, recoverable credentials/infrastructure, independent administrator/account dispositions, migration rehearsal/parity closure, real provider evidence and explicit founder approval.

**TENENTE SWARM: PARTIAL** ? execution controls work locally; hosted and operational integration gates remain.

**SI/ASI PREVENTION KIT: PARTIAL** ? signed gateway containment works locally; real cooperating-runtime cancellation remains incomplete.

**CORE PRODUCTION: NO-GO** ? no new hosted/recovery/owner evidence supports promotion.
