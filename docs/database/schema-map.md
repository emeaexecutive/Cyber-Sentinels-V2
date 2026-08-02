# Database schema map

## Reading this map

This is a static migration-source map. “Indexes” counts explicit `create index` statements discovered for the table and excludes implicit primary-key/unique indexes. “RLS” means an enablement statement exists somewhere in ordered migration source. “Referenced by” lists representative TypeScript consumers, not every SQL trigger/function dependency.

## Core verification and trust records

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `audit_logs` | Auditable operational actions | `id`; actor/subject references are logical | 0 | Yes | admin, agent and trust handlers; 53 source files |
| `decisions` | Verification decisions | `id`; `verification_case_id -> verification_cases.id` | 0 | Yes | trust flows and admin integrity; 111 files |
| `evidence_chains` | Integrity-linked evidence chains | `id`; workspace/subject links added by later migrations | 2 | Yes | enterprise audit, replay and receipt flows |
| `evidence_files` | Uploaded evidence metadata | `id`; `verification_case_id -> verification_cases.id` | 0 | Yes | evidence upload, admin decision and AI analysis |
| `passport_state_checks` | Passport state/continuity checks | `id`; logical passport references | 0 | Yes | state verification, back office and graph engine |
| `passports` | Trust/verification passports | `id`; owner relationships added by migration | 0 | Yes | passport, verification and admin surfaces; 63 files |
| `risk_scores` | Case risk scores | `id`; `verification_case_id -> verification_cases.id` | 0 | Yes | demo seed and back-office service |
| `signals` | General trust/risk signals | `id`; logical subject references | 0 | Yes | trust engines and operational surfaces; 182 files |
| `trust_reports` | Generated trust reports | `id`; owner relationship is policy/logical | 0 | Yes | candidate, client and report routes |
| `trust_scores` | Interview trust score | `id`; `session_id -> interview_sessions.id` | 0 | Yes | interview report and hiring-score route |
| `verification_cases` | Verification workflow cases | `id`; `passport_id -> passports.id` | 0 | Yes | admin, AI governance and workflow handlers |
| `verification_events` | Hiring verification events | `id`; `session_id -> interview_sessions.id` | 0 | Yes | admin reviews and candidate verification |
| `verification_passports` | Initial-schema verification passport record | `id`; none explicit | 0 | Yes | No direct TypeScript reference found |
| `verification_receipts` | Integrity-protected verification receipts | `id`; workspace/subject links are logical/added | 3 | Yes | replay, receipt and admin evidence surfaces |

## Workspaces, governance, replay and operations

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `governance_actions` | Review/escalation actions | `id`; `policy_id -> governance_policies.id` | 3 | Yes | governance dashboard, founder control and workspaces |
| `governance_policies` | Workspace policy definitions | `id`; `workspace_id -> trust_workspaces.id` | 1 | Yes | governance, pilot setup and workspace pages |
| `launch_control_notes` | Admin launch notes | `id`; none explicit | 1 | Yes | launch/readiness/founder admin pages |
| `notifications` | User/admin operational notifications | `id`; user/workspace relationships are logical | 2 | Yes | dashboard, back office and notification services |
| `operational_intelligence_events` | Derived operational-risk events | `id`; logical workspace/subject links | 3 | Yes | TrustOps, interview-risk and workspace pages |
| `support_issues` | User-reported issues and screenshot metadata | `id`; logical user/workflow links | 3 | Yes | support pages/routes and issue reporting |
| `trust_case_relationships` | Case evidence/subject relationships | `id`; `case_id -> trust_cases.id` | 1 | Yes | workspace case page |
| `trust_cases` | Workspace trust cases | `id`; `workspace_id -> trust_workspaces.id` | 1 | Yes | workflows, provenance and admin; 15 files |
| `trust_relationships` | Subject-to-subject trust edges | `id`; workspace/subject IDs are logical | 4 | Yes | agents, passports and founder control |
| `trust_replay_sessions` | Replay session records | `id`; workspace/subject IDs are logical | 3 | Yes | replay, governance and evidence surfaces; 29 files |
| `trust_timeline_events` | Chronological trust events | `id`; workspace/subject IDs are logical | 4 | Yes | execution, integrity and founder control; 30 files |
| `trust_workspaces` | Tenant/workspace root | `id`; creator links to auth user logically | 1 | Yes | governance, pilot and workspace pages |
| `workspace_members` | Workspace membership | `id`; `workspace_id -> trust_workspaces.id` | 1 | Yes | governance, pilot setup and workspace pages |

## Identity, agents and provider records

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `agent_activity` | AI-agent activity events | `id`; `agent_id -> ai_agents.id` | 1 | Yes | analysis routes and agent surfaces |
| `agent_permissions` | Agent permission assignments | `id`; agent relation is logical | 0 | Yes | agent runtime and AI governance |
| `agents` | Legacy/general agent registry | `id`; owner relations are logical | 0 | Yes | agent/admin/trust surfaces; 67 files |
| `ai_agents` | Standards-oriented AI-agent identities | `id`; owner/enterprise links are logical | 4 | Yes | registry, governance and provenance |
| `hopae_verifications` | Hopae verification sessions | `id`; workspace/workflow links added later | 3 | Yes | provider server module, workspace and integrations |
| `hopae_webhook_events` | Hopae callback ledger | `id`; verification/workspace links are logical | 2 | Yes | Hopae server module and runtime validation |
| `normalized_identity_evidence` | Provider-neutral normalized identity evidence | `evidence_id`; tenant -> workspace, trust session -> case, provider -> registry | 2 | Yes | provider status and provider API |
| `provider_execution_records` | Provider execution/audit records | `execution_id`; tenant -> workspace, workflow -> case, review -> release review | 2 | Yes | provider API/status and deployment readiness |
| `provider_operational_health_snapshots` | Global Hopae operational health observations | `snapshot_id`; `provider_id -> provider_registry.provider_id` | 1 | Yes | provider API and Hopae server module |
| `provider_health_snapshots` | Tenant-scoped Provider Consensus health evidence | `id`; `enterprise_id -> trust_workspaces.id` | 1 | Yes | Consensus, Continuous Trust, Replay, and Trust Architecture |
| `provider_registry` | Tenant-aware provider enablement | `provider_id`; none explicit | 0 | Yes | provider API/status and Hopae server module |
| `provider_state_audit` | Provider enable/disable audit | `audit_id`; `provider_id -> provider_registry.provider_id` | 1 | Yes | admin provider status |
| `provenance_events` | Agent/subject provenance events | `id`; subject relationships are logical | 2 | Yes | agents, provenance API and governance dashboard |
| `verifiers` | Verifier network applications | `id`; user relation is logical | 2 | Yes | verifier API and network page |

## Session integrity and hiring

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `admin_reviews` | Human review of verification events | `id`; `verification_event_id -> verification_events.id` | 0 | Yes | admin reviews and benchmarking |
| `candidate_profiles` | Candidate-owned hiring profiles | `id`; auth owner relation is logical | 0 | Yes | candidate verification, back office, interview risk |
| `device_channel_evidence` | Device/channel evidence per session | `id`; integrity check -> session check, interview -> interview session | 1 | Yes | session-integrity route and runtime validation |
| `injection_risk_events` | Injection/tampering risk events | `id`; integrity check -> session check, interview -> interview session | 1 | Yes | session-integrity route and runtime validation |
| `interview_risk_events` | Detailed interview risk events | `id`; `interview_session_id -> interview_sessions.id` | 2 | Yes | interview routes and pilot overview |
| `interview_risk_signals` | Interview risk signal summary | `id`; `session_id -> interview_sessions.id` | 0 | Yes | interview create/analyze and risk dashboard |
| `interview_sessions` | Candidate/recruiter interview workflow | `id`; candidate -> candidate profile, recruiter -> recruiter profile | 0 | Yes | interview and integrity flows; 15 files |
| `liveness_checks` | Interview liveness results | `id`; `session_id -> interview_sessions.id` | 0 | Yes | No direct TypeScript reference found |
| `recruiter_profiles` | Recruiter-owned hiring profiles | `id`; auth owner relation is logical | 0 | Yes | recruiter verification, back office, interview risk |
| `session_integrity_checks` | Session integrity parent record | `id`; `interview_session_id -> interview_sessions.id` | 1 | Yes | integrity route/dashboard and interview surfaces |
| `verification_signals` | Separated session verification flags | `id`; integrity check -> session check, interview -> interview session | 1 | Yes | integrity route/dashboard and interview page |

## Messaging, requests and content

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `appeals` | User appeals | `id`; user/case relationships are logical | 0 | Yes | admin review, AI governance and appeals UI |
| `data_rights_requests` | Privacy/data-rights requests | `id`; user relation is logical | 0 | Yes | request page, back office and admin status route |
| `feedback_reports` | Structured product/user feedback | `id`; user relation is logical | 0 | Yes | back office and feedback admin route |
| `help_questions` | Submitted help questions | `id`; user relation is logical | 0 | Yes | help, assistant and back-office flows |
| `interest_signals` | Product/enterprise interest events | `id`; request relation is logical | 0 | Yes | enterprise access and feedback operations |
| `knowledge_articles` | Approved assistant/help content | `id`; author relation is logical | 0 | Yes | help, assistant and back-office flows |
| `message_events` | Events within a message thread | `id`; `thread_id -> message_threads.id` | 0 | Yes | message action, page and back office |
| `message_threads` | User message threads | `id`; user relation is logical | 0 | Yes | message action, page and back office |
| `trust_assistant_questions` | Trust-assistant question queue | `id`; user relation is logical | 0 | Yes | assistant admin route and back office |

## Commercial, access and team data

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `api_keys` | Developer API-key metadata | `id`; user/team relationships are logical | 0 | Yes | developer console, API-key route and team workspace |
| `billing_customers` | User-to-Stripe customer mapping | `id`; auth user relation is logical | 1 | Yes | Stripe checkout/portal and back office |
| `enterprise_access_requests` | Public enterprise access submissions | `id`; none explicit | 0 | Yes | enterprise-access route and admin operations |
| `subscriptions` | Stripe subscription state | `id`; customer/user relationships are logical | 2 | Yes | Stripe webhook, billing and back office |
| `team_members` | Team membership | `id`; `team_id -> teams.id` | 0 | **No source enablement** | team invite/summary and team-access UI |
| `teams` | Team root record | `id`; owner relation is logical | 0 | **No source enablement** | team flows plus broad textual matches |
| `usage_limits` | Per-user usage limits | `id`; user relation is logical | 1 | Yes | billing service and runtime validation |
| `waitlist` | Public waitlist submissions | `id`; none explicit | 0 | Yes | waitlist, enterprise access and checkout flows |

## Platform features and governance extensions

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `autonomy_profiles` | Autonomous-agent governance profile | `id`; subject relations logical | 0 | Yes | autonomy, execution-passport and graph pages |
| `execution_passports` | Execution authorization evidence | `id`; subject relations logical | 0 | Yes | execution-passport, back office and graph engine |
| `intent_requests` | Intent-verification requests | `id`; subject relations logical | 0 | Yes | intent, autonomy and execution-passport pages |
| `trust_alerts` | Enterprise trust alerts | `id`; creator/subject relations logical | 3 | Yes | trust alerts API and governance dashboard |
| `trust_algorithm_runs` | Trust algorithm execution records | `id`; subject relations logical | 1 | Yes | agent, algorithm and AI governance flows |
| `trust_certifications` | Enterprise trust certifications | `id`; creator/subject relations logical | 3 | Yes | certification API and governance dashboard |
| `trust_events` | AI-agent trust event stream | `id`; agent/owner relations logical | 0 | Yes | agent and governance surfaces |
| `trust_graph_edges` | Legacy trust graph edges | `id`; node links stored logically | 0 | Yes | back office and graph engine |
| `trust_graph_nodes` | Legacy trust graph nodes | `id`; subject links logical | 0 | Yes | back office, assistant and graph engine |

## Validation, release and ORI

| Table | Purpose | Primary key / foreign-key relationships | Indexes | RLS | Referenced by |
| --- | --- | --- | ---: | --- | --- |
| `api_test_runs` | Retained API harness results | `id`; none explicit | 1 | Yes | founder control and validation harnesses |
| `integration_status` | Integration readiness observations | `id`; provider relation logical | 1 | Yes | admin integrations, status and validation |
| `operational_measurements` | Durable operational measurements | `measurement_id`; optional tenant logical | 2 | Yes | durable telemetry and release evidence |
| `ori_feature_registry` | Versioned ORI feature definitions | composite `feature_id, feature_version, schema_version` | 0 | Yes | SQL/fixtures; no direct TypeScript table reference |
| `ori_inference_records` | Non-authoritative ORI inference records | `inference_id`; tenant -> workspace, trust session -> case | 3 | Yes | admin review API/UI and inference service |
| `ori_model_registry` | Versioned ORI model artifacts/state | `registry_id`; none explicit | 1 | Yes | SQL/functions; no direct TypeScript table reference |
| `ori_model_state_audit` | ORI model-state audit | `audit_id`; `registry_id -> ori_model_registry.registry_id` | 1 | Yes | Trigger/function managed; no direct TS reference |
| `ori_reviewer_outcomes` | Reviewed ORI outcomes | `outcome_id`; inference -> inference record, tenant -> workspace | 1 | Yes | ORI validation metrics |
| `release_evidence_checks` | Release evidence checklist results | `id`; release/category logical | 1 | Yes | RC6 release evidence module |
| `release_validation_cases` | Controlled validation cases | `case_id`; none explicit | 1 | Yes | admin reviews and release evidence |
| `release_validation_reviews` | Reviewed validation outcomes | `id`; `case_id -> release_validation_cases.case_id` | 1 | Yes | SQL/RPC managed; no direct TS table reference |
| `runtime_validation_logs` | Runtime-validation execution logs | `id`; none explicit | 2 | Yes | founder control and validation runner |
| `webhook_event_ledger` | Idempotent webhook receipt ledger | `id`; `duplicate_of -> webhook_event_ledger.id` | 2 | Yes | webhook event-ledger service |

## Unreferenced and ambiguous records

Static source search found no direct TypeScript table-name reference for `verification_passports`, `liveness_checks`, `ori_feature_registry`, `ori_model_registry`, `ori_model_state_audit`, or `release_validation_reviews`. Some are intentionally function/trigger/RPC managed; others may be legacy or incomplete. Do not remove them without deployed usage, function dependency, retention and rollback analysis.
