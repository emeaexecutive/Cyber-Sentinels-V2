# Bounded operational gap review

Reviewed 2026-09-29. Scope is the known gaps in the execution-proof request. Existing Vercel logs, Supabase tables/RLS and release scripts remain the operating infrastructure; no plugins, services, dependencies, API scopes or tables were added.

| Known gap | Classification | Evidence and bounded next step |
| --- | --- | --- |
| Webhook retry consumption | AUTOMATE | `lib/public-api/v1/webhook-delivery.ts` performs one attempt and stores `next_attempt_at`; no qualified consumer is established. The existing OpenAPI states this limitation. Before enabling a native scheduled consumer, require claiming/concurrency, bounded attempts, terminal failure, idempotency and destination qualification. Scheduling metadata is not delivered retry proof. |
| Failed webhook reconciliation | AUTOMATE | Existing `public_api_webhook_events` contains state/attempt metadata. Reconcile queued/failed entries against destination acknowledgement with the existing store; do not automatically re-send uncertain effects. No replay worker was introduced in this bounded change. |
| Provider failure alerts | BLOCKED EXTERNAL | Runtime error/log mechanisms exist; a routed, received and acknowledged alert is not proven. Use existing native log/alert controls once recipient and routing ownership are configured. No test messages were sent. |
| Auth failure alerts | BLOCKED EXTERNAL | `lib/auth/callback-handler.ts` emits operational issues; actual alert delivery/triage remains unverified. Configure existing monitoring with an owner and verify delivery separately. |
| Release evidence automation | FIX NOW | Corrected `tools/release/auth-public-smoke.mjs` and behavioral regressions distinguish HTTP 200 streamed redirects, history changes and immutable navigation snapshots. Existing release tooling can retain the read-only JSON; authenticated/manual statuses remain explicit. |
| Backup verification | BLOCKED EXTERNAL | WAL-G flag true, PITR false, no returned backup records. [Recovery report](PRODUCTION_PROOF_AND_RECOVERY.md) provides a safe isolated drill recommendation; no actual restore or measured RPO/RTO exists. |
| Dead adapters | REMOVE LATER | OpenGraph execution is explicitly disabled and Judge.me is a non-live boundary; retain tested contracts while qualification is blocked. Delete only when an owner retires the integration and callsite/fixture review proves removal safe. Do not represent scaffolding as an active provider. |
| Legacy projections | KEEP | Preserve projections still read by receipt, Replay and Memory paths; no redundant database removal is justified by this audit. Outcome evidence must not rewrite the original decision. |
| Stale backoffice sources | BLOCKED EXTERNAL | Anonymous protection verified. Authenticated Production tenant/role and data-freshness proof needs the owner session; local source tests cannot certify live data. |
| Provider status truth | KEEP | OpenGraph/Judge.me remain IMPLEMENTED NOT EXERCISED / BLOCKED_EXTERNAL. No matching credential names in local inspected files/process or Vercel Production/Preview metadata. [Qualification matrix](PROVIDER_EXECUTION_QUALIFICATION.md) separates ingestion from action. |
| Error visibility | FIX NOW | Webhook insert, transport and delivery-state persistence failures now emit redacted operational issues. Duplicate inserts do not dispatch. State updates bind tenant and event. A state persistence failure does not trigger a second delivery or get mistaken for a transport failure. |

## Justified implementation

- **P0 integrity/security:** prevent unauthenticated destination assertions from supporting outcomes and detect signed evidence after DENY without changing the decision; confine webhook delivery to its configured destination by rejecting redirects. See the [execution audit](EXECUTION_OUTCOME_PROOF_AUDIT.md) for exact scope and remaining correlation limits.
- **P1 proof:** preserve sanitized UNKNOWN execution results after executor errors; distinguish asserted provider success from observed destination effects; remove provider-name-based assurance inference; repair the four reproduced SQL defects in one forward migration. See the [SQL review](EXECUTION_PROOF_SQL_REVIEW.md).
- **P2 visibility:** repair the read-only smoke evidence and expose webhook failures through existing logs. Log delivery is not alert delivery, and HTTP acknowledgement is not independent proof of a business outcome.

`tests/public-webhook-delivery.test.mjs` executes the real delivery module with database/monitoring boundaries controlled. It covers event insert failure, duplicates, unconfigured delivery, HTTP rejection, transport exception redaction, tenant-scoped state persistence, successful acknowledgement, and no repeat dispatch on persistence failure. The redirect regression uses actual HTTP servers and verifies the second destination receives nothing.

No retry service, second policy engine, IAM, EDR, backup product or speculative generic evidence system was built. The sole new migration replaces four broken functions; it does not add schema objects and is not applied to Production in this task.

The exact PR branch is disabled under `git.deploymentEnabled` in `vercel.json` to honor the requested no-deployment boundary when pushing it. [Vercel's branch configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled) otherwise enables deployment for unspecified branches. The existing main-branch rule is retained; no hosted project setting or environment variable was changed.
