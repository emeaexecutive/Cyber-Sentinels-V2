# V2 API source inventory

289 route files, generated with `node tools/v2-api-inventory.mjs`.

All entries exist in source. Gate names are lexical evidence only; absence does not prove an unprotected route and presence does not prove correct tenant binding. Follow the listed imports and the audit's family findings. No live route is certified by this inventory. Re-exported HTTP methods require inspecting the linked module.

| Route | HTTP methods | Direct gate markers | Local implementation imports |
| --- | --- | --- | --- |
| `/api/access/governance` | GET | shared dependency / middleware; inspect | `@/lib/access-governance-api` |
| `/api/admin/access` | POST | requireAdminApiAccess | `@/lib/admin-auth`, `@/lib/auth/isAdmin`, `@/lib/security`, `@/lib/env`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/api-tests/run` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/api-tests/harness`, `@/lib/supabase/server` |
| `/api/admin/appeals/[id]/review` | POST | requireAdminApiAccess | `@/lib/communications/createNotification`, `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/assistant/draft-answer` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/consensus/policies/[id]` | PATCH | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/policy-service`, `@/src/lib/consensus/types` |
| `/api/admin/consensus/policies` | POST | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/policy-service`, `@/src/lib/consensus/types` |
| `/api/admin/consensus/simulate` | POST | shared dependency / middleware; inspect | `@/src/lib/consensus/replay`, `@/src/lib/consensus/http`, `@/src/lib/consensus/policy`, `@/src/lib/consensus/repository`, `@/src/lib/consensus/types` |
| `/api/admin/consent/policies` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/trust-events/canonicalize`, `@/src/lib/trust-events/hash`, `@/lib/identity-signals/enterprise-context`, `@/src/lib/consent/http`, `@/src/lib/consent/repository`, `@/src/lib/consent/service` |
| `/api/admin/consent/summary` | GET | shared dependency / middleware; inspect | `@/lib/identity-signals/enterprise-context`, `@/src/lib/consent/http`, `@/src/lib/consent/repository`, `@/src/lib/consent/types` |
| `/api/admin/data-rights/[id]/status` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/enterprise-operations` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/platform-health`, `@/lib/enterprise-operations`, `@/lib/supabase/server` |
| `/api/admin/evidence/[id]/decision` | POST | requireAdminApiAccess | `@/lib/communications/createNotification`, `@/lib/auth/isAdmin`, `@/lib/supabase/server` |
| `/api/admin/fake-actors/[id]/block` | POST | shared dependency / middleware; inspect | `@/lib/admin/fake-actor-api` |
| `/api/admin/fake-actors/[id]/escalate` | POST | shared dependency / middleware; inspect | `@/lib/admin/fake-actor-api` |
| `/api/admin/fake-actors/[id]/export` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/admin/fake-actors`, `@/lib/supabase/server`, `@/lib/supabase/service-role` |
| `/api/admin/fake-actors/[id]/false-positive` | POST | shared dependency / middleware; inspect | `@/lib/admin/fake-actor-api` |
| `/api/admin/fake-actors/[id]/remove` | POST | shared dependency / middleware; inspect | `@/lib/admin/fake-actor-api` |
| `/api/admin/fake-actors/[id]/report` | POST | shared dependency / middleware; inspect | `@/lib/admin/fake-actor-api` |
| `/api/admin/fake-actors` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/admin/fake-actors`, `@/lib/supabase/server`, `@/lib/supabase/service-role` |
| `/api/admin/feedback/[id]` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/help-questions/[id]/answer` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/messages/[id]/action` | POST | requireAdminApiAccess | `@/lib/communications/createNotification`, `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/reviews` | GET, POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/supabase/service-role`, `@/lib/operational-risk` |
| `/api/admin/support/[id]` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/supabase/service-role` |
| `/api/admin/trust-architecture/policies/[policyId]/governance` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository`, `@/lib/enterprise-operations` |
| `/api/admin/trust-architecture/policies/[policyId]` | PATCH | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/service` |
| `/api/admin/trust-architecture/policies` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository`, `@/src/lib/trust-architecture/service` |
| `/api/admin/trust-assistant-questions/[id]/answer` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/admin/trust-graph/entity-statistics` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/admin/trust-graph/provider-health` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/admin/trust-graph/relationship-statistics` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/admin/trust-graph/system-health` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/admin/trust-graph/tenant-statistics` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/admin/trust-integrity/repair` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/trust-integrity/repair`, `@/lib/supabase/server` |
| `/api/admin/verification-cases/[id]/decision` | POST | requireAdminApiAccess | `@/lib/communications/createNotification`, `@/lib/admin-auth`, `@/lib/auth/isAdmin`, `@/lib/back-office`, `@/lib/security`, `@/lib/supabase/server`, `@/lib/trust-engine/calculateTrustScore`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/decisionEngine`, `@/lib/trust-engine/policyEngine` |
| `/api/agents/[id]` | GET, PATCH | auth.getUser | `@/lib/admin-auth`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/ai-trust/types` |
| `/api/agents/activity` | GET | auth.getUser | `@/lib/supabase/server`, `@/lib/admin-auth` |
| `/api/agents/register` | re-export; inspect source | shared dependency / middleware; inspect | `@/app/api/agents/route` |
| `/api/agents` | GET, POST, PATCH, DELETE | auth.getUser | `@/lib/admin-auth`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-receipts/receipts` |
| `/api/agents/verify` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/admin-auth` |
| `/api/ai-governance/analyze` | POST | auth.getUser | `@/lib/admin-auth`, `@/lib/ai/governanceAssistant`, `@/lib/ai/openai`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/security`, `@/lib/ai/provider-policy` |
| `/api/audit/export` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/core/replay-engine`, `@/lib/trust-transparency` |
| `/api/audit/summary` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/core/replay-engine` |
| `/api/auth/logout` | GET, POST | auth.getUser | `@/lib/admin-auth`, `@/lib/supabase/server`, `@/lib/auth/auth-replay-events`, `@/lib/auth/password-recovery` |
| `/api/auth/password-reset/complete` | POST | auth.getUser, authenticate | `@/lib/auth/password-recovery`, `@/lib/operational-monitoring`, `@/lib/supabase/server` |
| `/api/auth/password-reset/request` | POST | shared dependency / middleware; inspect | `@/lib/bot-protection`, `@/lib/auth/password-recovery`, `@/lib/operational-monitoring`, `@/lib/supabase/server` |
| `/api/auth/replay-event` | POST | auth.getUser | `@/lib/auth/auth-replay-events`, `@/lib/supabase/server` |
| `/api/auth/session-action` | POST | auth.getUser | `@/lib/auth/mfa`, `@/lib/auth/auth-replay-events`, `@/lib/supabase/server` |
| `/api/auth/session-expired` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/auth/turnstile` | POST | shared dependency / middleware; inspect | `@/lib/bot-protection`, `@/lib/operations/observability` |
| `/api/authorization/history` | GET | shared dependency / middleware; inspect | `@/lib/access-governance-api` |
| `/api/badges/verify` | POST | shared dependency / middleware; inspect |  |
| `/api/billing/checkout` | POST | shared dependency / middleware; inspect |  |
| `/api/candidate/verify` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/phase1`, `@/lib/trust-receipts/receipts`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/client/summary` | GET | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/clientPortal` |
| `/api/compliance/export` | POST | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/complianceExport` |
| `/api/consensus/decisions/[id]/explanation` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/explain`, `@/src/lib/consensus/http`, `@/src/lib/consensus/repository` |
| `/api/consensus/decisions/[id]` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/repository` |
| `/api/consensus/decisions` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/repository` |
| `/api/consensus/evaluate` | POST | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/service` |
| `/api/consensus/policies` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/policy`, `@/src/lib/consensus/repository` |
| `/api/consensus/providers/health` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/provider-registry`, `@/src/lib/consensus/repository` |
| `/api/consensus/providers` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/provider-registry` |
| `/api/consensus/subjects/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/repository` |
| `/api/consensus/subjects/[subjectId]/timeline` | GET | shared dependency / middleware; inspect | `@/src/lib/consensus/http`, `@/src/lib/consensus/repository` |
| `/api/consent/catalogue` | GET | shared dependency / middleware; inspect | `@/src/lib/consent/http`, `@/src/lib/consent/policy`, `@/src/lib/consent/repository`, `@/lib/identity-signals/enterprise-context` |
| `/api/consent/cookies` | POST | shared dependency / middleware; inspect | `@/lib/security`, `@/src/lib/consent/cookie`, `@/src/lib/consent/cookie-contract`, `@/src/lib/consent/http`, `@/src/lib/consent/policy`, `@/src/lib/consent/service` |
| `/api/consent/history` | GET | shared dependency / middleware; inspect | `@/src/lib/consent/http`, `@/src/lib/consent/repository` |
| `/api/consent/policy` | GET | shared dependency / middleware; inspect | `@/src/lib/consent/http`, `@/src/lib/consent/policy` |
| `/api/consent/receipt/[id]` | GET | shared dependency / middleware; inspect | `@/src/lib/consent/http`, `@/src/lib/consent/repository` |
| `/api/consent` | GET, POST, PATCH | shared dependency / middleware; inspect | `@/lib/security`, `@/src/lib/consent/cookie`, `@/src/lib/consent/http`, `@/src/lib/consent/policy`, `@/src/lib/consent/service` |
| `/api/consent/withdraw` | POST | shared dependency / middleware; inspect | `../route` |
| `/api/demo/seed` | POST | shared dependency / middleware; inspect | `@/lib/demo/demoWorkspace`, `@/lib/env` |
| `/api/detection/status` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/detection/detection-engine`, `@/lib/supabase/server`, `@/lib/validation/benchmark-harness` |
| `/api/developer/api-keys` | GET, POST, PATCH | shared dependency / middleware; inspect | `@/lib/supabase/service-role`, `@/lib/identity-signals/enterprise-context`, `@/lib/public-api/v1/authentication`, `@/lib/public-api/v1/contracts` |
| `/api/embed/[id]` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/public-verification/embeds` |
| `/api/enterprise-access` | POST | shared dependency / middleware; inspect | `@/lib/bot-protection`, `@/lib/request-demo` |
| `/api/evidence-graph` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/evidence-graph/evidence-graph`, `@/lib/evidence-graph/query`, `@/lib/supabase/server`, `@/lib/providers`, `@/lib/trust-replay/replay`, `@/lib/governance/reviewed-outcomes`, `@/lib/validation/benchmark-harness` |
| `/api/evidence/[id]` | GET | shared dependency / middleware; inspect | `@/src/core/trust/evidence/supabase-repository`, `@/src/core/trust/graph`, `@/src/core/trust/intelligence/http` |
| `/api/evidence/graph/[identity]` | GET | shared dependency / middleware; inspect | `@/src/core/trust/evidence/supabase-repository`, `@/src/core/trust/graph`, `@/src/core/trust/intelligence/http` |
| `/api/evidence/history/[identity]` | GET | shared dependency / middleware; inspect | `@/src/core/trust/evidence/supabase-repository`, `@/src/core/trust/graph`, `@/src/core/trust/intelligence/http` |
| `/api/evidence` | POST | auth.getUser | `@/lib/supabase/server` |
| `/api/evidence/upload` | POST | auth.getUser | `@/lib/communications/createNotification`, `@/lib/admin-auth`, `@/lib/billing/checkUsageLimit`, `@/lib/operational-monitoring`, `@/lib/supabase/server` |
| `/api/feed/public` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-feed/feed` |
| `/api/governance/events` | GET | authenticatedTrustClient | `@/lib/operational-trust/api` |
| `/api/governance/routing` | GET, POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/governance-engine`, `@/lib/trust-engine/createAuditLog`, `@/lib/policy-engine`, `@/lib/supabase/server` |
| `/api/health/identity-signals` | GET | shared dependency / middleware; inspect | `@/lib/providers/adapters/hopae/hopae-config`, `@/lib/identity-signals/repository` |
| `/api/health` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts` |
| `/api/hpg/analyze` | POST | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/humanPresenceGenome` |
| `/api/identity/providers/health` | GET | shared dependency / middleware; inspect | `@/lib/providers/adapters/hopae/hopae-config`, `@/lib/providers/adapters/hopae/hopae-adapter`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository` |
| `/api/identity/providers` | GET | shared dependency / middleware; inspect | `@/lib/providers/adapters/hopae/hopae-config`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository`, `@/lib/providers/capability-truth` |
| `/api/identity/subjects/[id]/confidence` | GET | shared dependency / middleware; inspect | `@/lib/identity-signals/core`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository` |
| `/api/identity/subjects/[id]/signals` | GET | shared dependency / middleware; inspect | `@/lib/identity-signals/core`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository` |
| `/api/identity/subjects` | POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/identity-signals/core`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository` |
| `/api/identity/verifications/[id]` | GET | shared dependency / middleware; inspect | `@/lib/identity-signals/core`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/repository` |
| `/api/identity/verifications` | GET, POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/identity-signals/adapters`, `@/lib/identity-signals/core`, `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/identity-signals/orchestrator`, `@/lib/identity-signals/repository`, `@/lib/identity-signals/presentation`, `@/lib/identity-signals/runtime`, `@/lib/identity-signals/types`, `@/lib/providers/hopae-rc1-server` |
| `/api/incidents/[id]/awareness` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/chronology` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/corrections` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/corrective-actions` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/evidence-snapshot` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/repository`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/impact` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/regulatory-assessment` | GET, POST, PUT | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/repository`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/replay` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/repository` |
| `/api/incidents/[id]/reporting-decision` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/submission-package` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/incidents/[id]/submissions` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/serious-incident/http`, `@/src/lib/serious-incident/service` |
| `/api/integrations/ats/receipts/[id]/export` | POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/integrations/ats`, `@/lib/integrations/ats/receipt-export`, `@/lib/supabase/service-role`, `@/lib/supabase/server` |
| `/api/integrations/ats/webhook` | POST | verifyATSWebhookSignature | `@/lib/bot-protection`, `@/lib/integrations/ats`, `@/lib/integrations/ats/security`, `@/lib/integrations/ats/workflow`, `@/lib/supabase/service-role` |
| `/api/internal/release-health` | GET | shared dependency / middleware; inspect | `../../../../tools/release/release-health.ts` |
| `/api/interview/analyze` | POST | auth.getUser | `@/lib/supabase/server` |
| `/api/interview/create` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/hiring`, `@/lib/trust-receipts/receipts`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/interview/liveness` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/phase1`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/interview/report` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/phase1`, `@/lib/trusted-layer/hiring`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/ledger/subject/[id]` | GET | shared dependency / middleware; inspect | `@/lib/trust-engine/trustLedger` |
| `/api/ml/benchmark` | POST, GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/ml-validation-engine`, `@/lib/supabase/server`, `@/lib/detection/providers` |
| `/api/ml/readiness` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/ml-validation-engine`, `@/lib/detection/detection-engine`, `@/lib/supabase/server`, `@/lib/validation/ml-readiness` |
| `/api/ml/status` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/supabase/server`, `@/lib/detection/providers`, `@/lib/detection/detection-engine`, `@/lib/validation/benchmark-harness`, `@/lib/operational-risk` |
| `/api/operational-entities/[entityId]/delegated-authority` | GET, POST | shared dependency / middleware; inspect | `@/lib/identity-signals/enterprise-context`, `@/lib/security`, `@/lib/operational-entities/delegated-authority`, `@/lib/operational-entities/delegated-authority-server` |
| `/api/operational-entities/[entityId]/enforcement` | GET, POST | shared dependency / middleware; inspect | `@/lib/identity-signals/enterprise-context`, `@/lib/security`, `@/lib/operational-entities/native-enforcement`, `@/lib/operational-entities/native-enforcement-server` |
| `/api/operational-entities/[entityId]/native-verification` | GET, POST | shared dependency / middleware; inspect | `@/lib/identity-signals/enterprise-context`, `@/lib/security`, `@/lib/operational-entities/native-verification`, `@/lib/operational-entities/native-verification-server` |
| `/api/operational-entities` | GET, POST | auth.getUser | `@/lib/supabase/server`, `@/lib/operational-entities/server`, `@/lib/identity-signals/enterprise-context`, `@/lib/operational-entities/delegated-authority-server` |
| `/api/operations/status` | GET | authenticated | `@/lib/identity-signals/enterprise-context`, `@/lib/identity-signals/http`, `@/lib/operations/external-control-truth`, `@/lib/providers/adapters/hopae/hopae-config` |
| `/api/origin/analyze` | POST | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/originDNA` |
| `/api/passports/[id]/decision` | POST | auth.getUser | `@/lib/database/events`, `@/lib/security`, `@/lib/supabase/server`, `@/lib/trust-engine/calculateTrustScore` |
| `/api/passports` | POST | requireAuthenticatedUser | `@/lib/database/events`, `@/lib/communications/createNotification`, `@/lib/security`, `@/lib/supabase/server`, `@/lib/billing/checkUsageLimit`, `@/lib/linkedin-verification`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/calculateHumanPresence`, `@/lib/trust-engine/calculateOriginTrace`, `@/lib/trust-engine/calculateTrustScore`, `@/types/origin` |
| `/api/permissions/check` | POST | shared dependency / middleware; inspect | `@/lib/trust-engine/permissionsFirewall`, `@/lib/trust-engine/agentRegistry` |
| `/api/policies` | GET, POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/governance-engine`, `@/lib/trust-engine/createAuditLog`, `@/lib/policy-engine`, `@/lib/supabase/server` |
| `/api/provenance/report/[id]` | GET | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/phase1` |
| `/api/provenance` | GET, POST, PATCH, DELETE | auth.getUser | `@/lib/admin-auth`, `@/lib/supabase/server` |
| `/api/provenance/verify` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/phase1`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-receipts/receipts`, `@/lib/trust/provenance-confidence` |
| `/api/providers/hopae/callback` | re-export; inspect source | shared dependency / middleware; inspect | `../../route` |
| `/api/providers` | GET, PATCH, PUT, POST | requireAdminApiAccess, auth.getUser | `@/lib/auth/isAdmin`, `@/lib/providers`, `@/lib/providers/provider-readiness`, `@/lib/supabase/server`, `@/lib/security`, `@/lib/providers/adapters/hopae/hopae-config`, `@/lib/providers/adapters/hopae/hopae-adapter`, `@/lib/providers/provider-health`, `@/lib/providers/provider-telemetry`, `@/lib/supabase/service-role`, `@/lib/providers/hopae-rc1-server`, `@/lib/webhooks/event-ledger`, `@/lib/identity-signals/hopae-callback-bridge`, `@/src/lib/trust-events/gateway`, `@/src/lib/trust-events/repository`, `@/lib/providers/runtime-contract` |
| `/api/providers/world-id/callback` | POST | authenticated | `@/lib/security` |
| `/api/public/profile/[id]` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/public-profile/profile` |
| `/api/public/verify/[id]` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/public-verification/verify` |
| `/api/ready` | GET | shared dependency / middleware; inspect | `@/lib/env`, `@/lib/readiness/enterprise-trust-registry`, `@/lib/supabase/service-role`, `@/lib/public-api/v1/environment` |
| `/api/reality-twin/analyze` | POST | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/realityTwin`, `@/lib/trust-engine/syntheticCounterpart` |
| `/api/receipts/[id]` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/trust-receipts/verification` |
| `/api/recruiter/verify` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-receipts/receipts`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal` |
| `/api/registry/search` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/public-verification/trustRegistry` |
| `/api/replay/[id]/events` | GET | shared dependency / middleware; inspect | `@/src/core/trust/replay`, `@/src/core/trust/replay/http`, `@/src/core/trust/replay/supabase-repository`, `@/src/core/trust/graph/http` |
| `/api/replay/[id]` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/core/replay-engine`, `@/src/core/trust/replay`, `@/src/core/trust/replay/http`, `@/src/core/trust/replay/supabase-repository`, `@/src/core/trust/graph/http`, `@/src/core/trust/intelligence/http` |
| `/api/replay/[id]/summary` | GET | shared dependency / middleware; inspect | `@/src/core/trust/replay`, `@/src/core/trust/replay/http`, `@/src/core/trust/replay/supabase-repository`, `@/src/core/trust/graph/http` |
| `/api/replay/[id]/timeline` | GET | shared dependency / middleware; inspect | `@/src/core/trust/replay`, `@/src/core/trust/replay/http`, `@/src/core/trust/replay/supabase-repository`, `@/src/core/trust/graph/http` |
| `/api/revocation/check` | POST | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/revocationEngine` |
| `/api/seals/verify/[id]` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/public-verification/trustSeals` |
| `/api/session/integrity` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/session-integrity/model`, `@/lib/trust-engine/createAuditLog` |
| `/api/session/risk` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/session-integrity/model` |
| `/api/status` | GET | shared dependency / middleware; inspect | `@/lib/api/public-contracts`, `@/lib/integrations/registry` |
| `/api/step-up` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/bot-protection`, `@/lib/trust-engine/stepUpVerification` |
| `/api/stripe/create-checkout-session` | POST | auth.getUser | `@/lib/billing/stripe`, `@/lib/env`, `@/lib/supabase/server`, `@/lib/supabase/service-role` |
| `/api/stripe/customer-portal` | POST | auth.getUser | `@/lib/billing/stripe`, `@/lib/env`, `@/lib/supabase/server`, `@/lib/supabase/service-role` |
| `/api/stripe/identity/webhook` | POST | shared dependency / middleware; inspect | `@/lib/env`, `@/lib/identity-signals/runtime`, `@/lib/identity-signals/stripe-webhook`, `@/lib/identity-signals/stripe-webhook-store`, `@/lib/webhooks/event-ledger` |
| `/api/stripe/webhook` | POST | constructEvent | `@/lib/billing/stripe`, `@/lib/env`, `@/lib/operational-monitoring`, `@/lib/security`, `@/lib/supabase/service-role`, `@/types/billing`, `@/lib/webhooks/event-ledger` |
| `/api/support/issues` | POST | auth.getUser, authenticated | `@/lib/supabase/server`, `@/lib/supabase/service-role`, `@/lib/operational-monitoring` |
| `/api/team/invite` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/team/accessControl` |
| `/api/team/summary` | GET | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/teamWorkspace` |
| `/api/trust-algorithm/run` | POST | auth.getUser | `@/lib/admin-auth`, `@/lib/core/trust-engine`, `@/lib/supabase/server`, `@/lib/trust-algorithm`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/security` |
| `/api/trust-architecture/decisions/[decisionId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/domains` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/health` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/kpis` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/replay/[decisionId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/replay`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/simulations/[simulationId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/simulations` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/service` |
| `/api/trust-architecture/subjects/[subjectId]/graph` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/evidence-graph`, `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/subjects/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-architecture/subjects/[subjectId]/timeline` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/trust-architecture/repository` |
| `/api/trust-centre/alerts/[id]/activity` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-centre/http`, `@/src/lib/trust-centre/repository` |
| `/api/trust-centre/alerts/bulk` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-centre/http`, `@/src/lib/trust-centre/repository` |
| `/api/trust-centre/overview` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-centre/http`, `@/src/lib/trust-centre/repository` |
| `/api/trust-centre/reports` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-centre/http`, `@/src/lib/trust-centre/repository`, `@/src/lib/trust-centre/reporting` |
| `/api/trust-centre/search` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-centre/http`, `@/src/lib/trust-centre/repository` |
| `/api/trust-dna/[identity]/history` | GET | shared dependency / middleware; inspect | `@/src/core/trust/dna`, `@/src/core/trust/dna/supabase-repository`, `@/src/core/trust/graph/http` |
| `/api/trust-dna/[identity]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-core/hash`, `@/src/core/trust/dna`, `@/src/core/trust/dna/supabase-repository`, `@/src/core/trust/evidence/supabase-repository`, `@/src/core/trust/intelligence/http` |
| `/api/trust-dna/recalculate` | POST | shared dependency / middleware; inspect | `@/src/core/trust/dna`, `@/src/core/trust/dna/supabase-repository`, `@/src/core/trust/graph/http` |
| `/api/trust-events/[id]/integrity` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/hash`, `@/src/lib/trust-events/http`, `@/src/lib/trust-events/types` |
| `/api/trust-events/[id]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/http` |
| `/api/trust-events/ingest/[provider]` | POST | authenticatedEnterpriseId, authenticatedActorId, authenticated | `@/lib/security`, `@/lib/identity-signals/enterprise-context`, `@/src/lib/trust-events/gateway`, `@/src/lib/trust-events/http`, `@/src/lib/trust-events/repository` |
| `/api/trust-events/providers/health` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/provider-registry`, `@/src/lib/trust-events/http` |
| `/api/trust-events` | GET, POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/ai-trust/types`, `@/src/lib/trust-events/http` |
| `/api/trust-events/sessions/[sessionId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/http` |
| `/api/trust-events/subjects/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/http` |
| `/api/trust-events/workflows/[workflowId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-events/http` |
| `/api/trust-fabric/contracts/[contractId]/evaluate` | POST | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/contracts`, `@/src/lib/trust-fabric/http`, `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/validation` |
| `/api/trust-fabric/contracts/[contractId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/http` |
| `/api/trust-fabric/contracts` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/http`, `@/src/lib/trust-fabric/validation` |
| `/api/trust-fabric/objects/[subjectType]/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/types`, `@/src/lib/trust-fabric/http` |
| `/api/trust-fabric/objects` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/http` |
| `/api/trust-fabric/overview` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/http`, `@/src/lib/trust-fabric/repository` |
| `/api/trust-fabric/timeline/[subjectType]/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-fabric/repository`, `@/src/lib/trust-fabric/types`, `@/src/lib/trust-fabric/timeline`, `@/src/lib/trust-fabric/http` |
| `/api/trust-intelligence/decision/[identity]` | GET | shared dependency / middleware; inspect | `@/src/core/trust/dna`, `@/src/core/trust/evidence/supabase-repository`, `@/src/core/trust/intelligence`, `@/src/core/trust/intelligence/http`, `@/src/lib/trust-core/hash` |
| `/api/trust-memory` | GET | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/governance/reviewed-outcomes`, `@/lib/supabase/server`, `@/lib/validation/benchmark-harness`, `@/lib/trust-memory/trust-memory` |
| `/api/trust-recovery` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/trustRecovery` |
| `/api/trust-reports` | POST | requireAuthenticatedUser | `@/lib/database/events`, `@/lib/security`, `@/lib/supabase/server`, `@/lib/linkedin-verification`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/trust-engine/calculateHumanPresence`, `@/lib/trust-engine/calculateOriginTrace`, `@/lib/trust-engine/calculateTrustScore`, `@/types/origin` |
| `/api/trust/alerts/[id]/acknowledge` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/alert-service` |
| `/api/trust/alerts/[id]/dismiss` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/alert-service` |
| `/api/trust/alerts/[id]/resolve` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/alert-service` |
| `/api/trust/alerts/[id]` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-repository` |
| `/api/trust/alerts` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/types`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/authenticate` | POST | auth.getUser, authenticatedUser | `@/lib/supabase/server`, `@/lib/auth/trust-authentication`, `@/lib/auth/auth-replay-events`, `@/lib/runtime/geo-session-intelligence`, `@/lib/trust-engine/createAuditLog`, `@/lib/events/event-bus`, `@/lib/cache/trust-cache` |
| `/api/trust/authorization` | GET | shared dependency / middleware; inspect | `@/lib/access-governance-api` |
| `/api/trust/calculate` | POST | shared dependency / middleware; inspect | `@/lib/trusted-layer/phase1`, `@/lib/api/trustResponses` |
| `/api/trust/certifications` | GET, POST, PATCH, DELETE | auth.getUser | `@/lib/supabase/server` |
| `/api/trust/check` | POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/supabase/server`, `@/lib/trust-engine/calculateHumanPresence`, `@/lib/trust-engine/calculateOriginTrace`, `@/lib/trust-engine/calculateTrustScore`, `@/lib/api/trustResponses`, `@/types/origin` |
| `/api/trust/decision` | POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/supabase/server`, `@/lib/bot-protection`, `@/lib/trust-engine/decisionEngine`, `@/lib/trust-engine/policyEngine`, `@/lib/api/trustResponses` |
| `/api/trust/entities/[entityId]/drift` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/entities/[entityId]/manual-review` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-service` |
| `/api/trust/entities/[entityId]/override` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/override-service` |
| `/api/trust/entities/[entityId]/recalculate` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/service` |
| `/api/trust/entities/[entityId]/signals` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-repository` |
| `/api/trust/entities/[entityId]/state` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/entities/[entityId]/transitions` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-repository` |
| `/api/trust/entity/[id]/graph` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/entity/[id]` | GET, PATCH | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase`, `@/src/core/trust/types` |
| `/api/trust/entity/[id]/summary` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/entity/[id]/timeline` | GET | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/entity` | POST | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase`, `@/src/core/trust/types` |
| `/api/trust/events` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/evidence` | GET, POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository`, `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/execute` | GET, POST | auth.getUser | `@/lib/supabase/server`, `@/lib/security`, `@/lib/operations/observability`, `@/lib/trust-transaction/server`, `@/src/lib/trust-transaction/canonical`, `@/src/lib/trust-fabric/types`, `@/lib/providers/hopae-rc1-server` |
| `/api/trust/explain` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/core/replay-engine`, `@/lib/core/decision-intelligence`, `@/lib/evidence-graph/evidence-graph`, `@/lib/trust-explanation/explanation`, `@/lib/providers/provider-readiness`, `@/lib/governance/reviewed-outcomes`, `@/lib/validation/benchmark-harness`, `@/lib/trust-replay/replay` |
| `/api/trust/hiring-score` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trusted-layer/hiring` |
| `/api/trust/jobs/process` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-service` |
| `/api/trust/manual-reviews/[id]/decision` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/review-service` |
| `/api/trust/manual-reviews` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-repository` |
| `/api/trust/passport` | GET | shared dependency / middleware; inspect | `@/lib/supabase/server`, `@/lib/api/trustResponses`, `@/types/api` |
| `/api/trust/posture` | GET | authenticatedTrustClient | `@/lib/operational-trust/api`, `@/lib/core/replay-engine` |
| `/api/trust/protected-workflows/[id]/evaluate` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/lib/protected-workflows/server` |
| `/api/trust/protected-workflows/[id]/evidence` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/lib/protected-workflows/server` |
| `/api/trust/protected-workflows/[id]/interventions` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/lib/protected-workflows/server` |
| `/api/trust/protected-workflows/[id]` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/lib/protected-workflows/server` |
| `/api/trust/protected-workflows` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/lib/protected-workflows/server` |
| `/api/trust/providers/health` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/recalculate` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/service` |
| `/api/trust/refresh` | POST | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository`, `@/src/lib/continuous-trust/service` |
| `/api/trust/relationship/[id]` | DELETE | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/relationship` | POST | shared dependency / middleware; inspect | `@/src/core/trust/graph`, `@/src/core/trust/graph/http`, `@/src/core/trust/repositories/supabase` |
| `/api/trust/replay/[decisionId]` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository`, `@/src/lib/trust-architecture/replay`, `@/src/lib/trust-architecture/repository` |
| `/api/trust/runtime/[subjectId]` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/runtime` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository` |
| `/api/trust/scope-continuity/decisions/[decisionId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/scope-continuity/http`, `@/src/lib/scope-continuity/repository` |
| `/api/trust/scope-continuity/evaluate` | POST | shared dependency / middleware; inspect | `@/src/lib/scope-continuity/service`, `@/src/lib/scope-continuity/http` |
| `/api/trust/scope-continuity/replay/[executionContextId]` | GET | shared dependency / middleware; inspect | `@/src/lib/trust-architecture/http`, `@/src/lib/scope-continuity/http`, `@/src/lib/scope-continuity/repository` |
| `/api/trust/sentinels` | GET, POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/trust-fabric/sentinel-agents-server`, `@/lib/trust-fabric/trust-twin-server`, `@/src/lib/trust-architecture/http` |
| `/api/trust/signals` | GET, POST | shared dependency / middleware; inspect | `@/lib/security`, `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/signal-service`, `@/src/lib/continuous-trust/signal-repository` |
| `/api/trust/thresholds` | GET, POST | requireAdminApiAccess | `@/lib/auth/isAdmin`, `@/lib/core/governance-engine`, `@/lib/policy-engine`, `@/lib/supabase/server` |
| `/api/trust/timeline` | GET | shared dependency / middleware; inspect | `@/src/lib/continuous-trust/http`, `@/src/lib/continuous-trust/repository`, `@/src/lib/trust-architecture/repository` |
| `/api/trust/transactions/[transactionId]/outcome-review` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-transaction/server`, `@/src/lib/trust-transaction/canonical` |
| `/api/trust/transactions/[transactionId]/receipt` | GET | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-transaction/server`, `@/lib/protected-workflows/server` |
| `/api/trust/twin/[entityId]` | GET | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/trust-fabric/trust-twin-server`, `@/src/lib/trust-architecture/http` |
| `/api/trust/twin/[entityId]/simulations` | POST | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/trust-fabric/trust-twin-server`, `@/lib/trust-fabric/trust-twin`, `@/src/lib/trust-architecture/http` |
| `/api/trust/verification/coverage` | GET | shared dependency / middleware; inspect | `@/lib/security`, `@/lib/trust-fabric/trust-twin-server`, `@/src/lib/trust-architecture/http` |
| `/api/v1/agents/[agentId]/authorities/[authorityId]/revoke` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/authorities/[authorityId]` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/authorities` | GET, POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/authority` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/challenge` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/credentials` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/heartbeat` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/control-plane-evidence` |
| `/api/v1/agents/[agentId]/manifest` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/proof` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents/[agentId]/trust-state` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/agents` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/evidence` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/incidents/[incidentId]/chronology` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/operational-incidents/server` |
| `/api/v1/incidents/[incidentId]/exports` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/operational-incidents/server` |
| `/api/v1/incidents/[incidentId]/replay` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/operational-incidents/server` |
| `/api/v1/incidents/[incidentId]` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/operational-incidents/server` |
| `/api/v1/incidents` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/operational-incidents/server` |
| `/api/v1/openapi.json` | GET | shared dependency / middleware; inspect | `@/lib/public-api/v1/openapi`, `@/lib/public-api/v1/contracts` |
| `/api/v1/reviews/[reviewReference]/resolve` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/reviews/[reviewReference]` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/trust/decisions` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/trust/transactions/[transactionId]/outcomes` | POST | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/trust/transactions/[transactionId]/receipt` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/trust/transactions/[transactionId]/replay` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/v1/trust/transactions/[transactionId]` | GET | withPublicApi | `@/lib/public-api/v1/contracts`, `@/lib/public-api/v1/handler`, `@/lib/public-api/v1/runtime` |
| `/api/verification/signals` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/session-integrity/model` |
| `/api/verifiers` | GET, POST | auth.getUser | `@/lib/supabase/server`, `@/lib/trust-engine/createAuditLog`, `@/lib/trust-engine/createSignal`, `@/lib/verifier-network/verifiers` |
| `/api/verify/world` | POST | requireAuthenticatedUser | `@/lib/security`, `@/lib/supabase/server`, `@/lib/providers/world-id-qualification-server`, `@/lib/providers/world-id-qualification`, `@/lib/trust-transaction/server`, `@/src/lib/trust-fabric/types` |
| `/api/waitlist` | POST | shared dependency / middleware; inspect | `@/lib/bot-protection`, `@/lib/database/events`, `@/lib/security`, `@/lib/supabase/server` |
| `/api/workflows/[id]/trust` | GET | authenticatedTrustClient | `@/lib/operational-trust/api` |
| `/api/workflows/access-state` | GET | shared dependency / middleware; inspect | `@/lib/access-governance-api` |
| `/api/world-id/rp-signature` | POST | auth.getUser | `@/lib/supabase/server`, `@/lib/security`, `@/lib/providers/world-id-verifier` |
