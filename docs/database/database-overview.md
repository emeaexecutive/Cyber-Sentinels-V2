# Database overview

## Evidence boundary

This inventory describes 58 SQL migration files under `supabase/migrations/`. It does not prove which migrations are applied to any hosted Supabase project. Deployment state requires a credentialed migration-history and catalog check.

## Source inventory

| Object | Observed source count | Notes |
| --- | ---: | --- |
| Distinct application tables | 90 | Duplicate idempotent declarations are counted once. |
| `create policy` statements | 192 | Includes policies later dropped/replaced or repeated defensively. |
| Functions | 55 | RPCs, integrity functions, trigger functions, pruning and export helpers. |
| Triggers | 37 | Timeline, governance, notifications, integrity, ORI and session signals. |
| Explicit indexes | 87 | Excludes indexes implicit in primary-key/unique constraints. |
| Views/materialized views | 0 | No source-defined view was found. |
| Extensions | 1 | `pgcrypto`. |
| Storage buckets | 2 final IDs | `evidence-files` and `support-screenshots`, both ultimately private. |
| Realtime publication changes | 0 | No Realtime publication configuration was found. |

`auth.users`, `storage.buckets` and `storage.objects` are platform-owned schemas referenced by application migrations and are not included in the 90 public application tables.

## Table domains

- Core verification: passports, verification cases/events/signals/receipts, evidence files/chains, decisions, risk/trust scores and audit logs.
- Trust operations: workspaces, cases, relationships, timeline, replay, governance, operational intelligence, notifications and support.
- Identity and providers: agents, AI agents, provider registry/executions/health, normalized evidence, Hopae and verifier records.
- Session/hiring: candidate/recruiter profiles, interviews, liveness, session integrity and risk events.
- Commercial/engagement: waitlist, enterprise access, billing, subscriptions, usage, feedback and interest.
- Validation and release: benchmark/review data, runtime validation, operational measurements and release evidence.
- ORI: model/feature registries, inference records, reviewer outcomes and model-state audit.

Full table keys, relationships, RLS evidence, explicit index counts and representative source consumers are in `schema-map.md`.

## Row-level security and policies

RLS enablement was found for 88 of 90 application tables. No RLS enablement statement was found for `teams` or `team_members`. This is a source-level security gap requiring deployed-catalog verification before remediation.

Policy generations evolve from early broad authenticated policies toward owner-, workspace-, tenant- and admin-scoped policies. Later migrations drop and replace selected earlier policies. Review the final ordered migration state, not an isolated policy declaration.

Service-role operations intentionally bypass RLS and therefore remain server-only. Public write policies exist for narrow ingress such as waitlist and enterprise-access submission; storage policies restrict authenticated bucket operations.

## Functions

The 55 functions comprise:

- enterprise access RPC: `submit_enterprise_access_request`;
- trust timeline helpers and recorders: safe UUID/timestamp, subject/actor extraction, generic event recording and evidence/decision/signal/algorithm/relationship/audit/agent/trust-event recorders;
- workspace/case timeline: `record_trust_case_created`, `record_trust_case_relationship_created`;
- governance: policy/action creation and governance derivation from algorithms, signals, activity, AI audit and missing evidence;
- notifications: insert plus governance, case, agent and AI audit notification functions;
- integrity: verification receipt, evidence chain, hiring risk and operational-intelligence integrity recorders;
- operational intelligence derivation from governance, cases, interviews and agent activity;
- session integrity recorders;
- release and trust-memory functions: workspace access, append-only protection, RC1 assessment, trust-memory tombstone;
- ORI model audit, immutable outcomes, reviewed-outcome recording and retention pruning;
- provider enablement and normalized identity-evidence persistence; and
- RC6 review, retention pruning and performance summary export.

Functions with `security definer` semantics must retain explicit search paths, least-privilege grants and tenant validation; each definition requires individual review.

## Triggers

Trigger groups are:

- 8 trust-timeline insert triggers;
- 5 operational notification triggers;
- 7 governance derivation/action triggers;
- 7 operational-intelligence integrity/derivation triggers;
- 2 receipt/evidence-chain integrity triggers;
- 2 trust-case timeline triggers;
- 2 session-integrity/verification-signal triggers;
- 1 hiring-risk record trigger;
- 1 append-only trust-memory trigger;
- 1 ORI model-state audit trigger; and
- 1 immutable ORI reviewer-outcome trigger.

## Indexes

The 87 explicit indexes cover owner/user lookup, subject/type/time queries, workspace/tenant scoping, provider session idempotency, webhook retention, release evidence, ORI retention/review, governance assignment and session/interview access. Index counts per table appear in `schema-map.md`. Tables showing zero may still have implicit primary-key or unique-constraint indexes.

## Storage

`evidence-files` was initially created public, then explicitly made private by a later migration. It permits PDF, PNG, JPEG and DOCX up to 10 MiB. `support-screenshots` is private and permits PNG, JPEG and WebP up to 5 MiB. Storage-object policies are source-defined for authenticated evidence access. Support screenshot access is mediated through service-role application code and metadata ownership checks.

## Views, Realtime and extensions

No views, materialized views or Realtime publication changes were found. Code must not assume Realtime delivery. `pgcrypto` supplies UUID/cryptographic database functions.

## Operational gaps

- Migration source and deployed schema are not automatically reconciled in this repository.
- Several migrations redefine the same table or policy defensively, increasing final-state review cost.
- Two team tables lack source-visible RLS enablement.
- Some tables have no direct TypeScript reference and may be trigger/RPC-only, planned, legacy or unused; see the schema map.
- No generated database types or canonical ER diagram was found.
