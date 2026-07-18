# API overview

## Scope and legend

The application defines 118 route files under `app/api/`. This source inventory records exported methods, access evidence, validation style, explicit error/status evidence and principal domain dependencies. It does not prove deployment, successful provider credentials or database grants.

Access codes:

- **A**: admin allowlist/cookie check in handler or shared helper.
- **M**: admin protection supplied by `middleware.ts` path classification.
- **S**: validated Supabase user/session check in the handler.
- **K**: static Trust API key check; production fails closed when unconfigured.
- **W**: verified webhook/provider signature.
- **N**: no explicit application guard found in the route or called access helper. RLS or downstream validation may still constrain data.
- **D**: delegates to another route and inherits its behavior.

Validation codes: **J** JSON/shape checks, **F** form data, **Q** query/path parameters, **H** content type/body size/signature headers, **P** dedicated parser/schema, and **-** no explicit input validation required/found. Errors list explicit source status codes; “default” means framework/default 200 or uncaught error handling.

## Administration and platform operations

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/access` | POST | A | F | 303 | admin-auth, auth, env, security |
| `/api/admin/api-tests/run` | POST | A | J | 303 | API harness, Supabase |
| `/api/admin/appeals/[id]/review` | POST | A | J,F | 303,400,404 | notifications, audit, Supabase |
| `/api/admin/assistant/draft-answer` | POST | A | J,F,H | 303,400,409,500,503 | OpenAI, audit, Supabase |
| `/api/admin/data-rights/[id]/status` | POST | A | J,F,H | 303,400,500 | audit, Supabase |
| `/api/admin/evidence/[id]/decision` | POST | A | J,F,H | 303,400,404,500 | notification, Supabase |
| `/api/admin/fake-actors/[id]/block` | POST | M | Q | default | shared fake-actor action |
| `/api/admin/fake-actors/[id]/escalate` | POST | M | Q | default | shared fake-actor action |
| `/api/admin/fake-actors/[id]/export` | POST | A | J,H,Q | 200,404,500 | fake actors, service role |
| `/api/admin/fake-actors/[id]/false-positive` | POST | M | Q | default | shared fake-actor action |
| `/api/admin/fake-actors/[id]/remove` | POST | M | Q | default | shared fake-actor action |
| `/api/admin/fake-actors/[id]/report` | POST | M | Q | default | shared fake-actor action |
| `/api/admin/fake-actors` | GET | A | J | default | fake actors, service role |
| `/api/admin/feedback/[id]` | POST | A | J,F,Q | 303,400,500 | audit, Supabase |
| `/api/admin/help-questions/[id]/answer` | POST | A | J,F,H,Q | 303,400,500 | audit, Supabase |
| `/api/admin/messages/[id]/action` | POST | A | J,F,Q | 303,400,404 | notification, audit |
| `/api/admin/reviews` | GET, POST | A | J,F,H | 303,400,500 | ORI, release reviews, service role |
| `/api/admin/support/[id]` | POST | A | J,F,Q | 303,400,500 | support, service role |
| `/api/admin/trust-assistant-questions/[id]/answer` | POST | A | J,F,H,Q | 303,400,500 | audit, Supabase |
| `/api/admin/trust-integrity/repair` | POST | A | J,F,H | 303,503 | trust-integrity repair |
| `/api/admin/verification-cases/[id]/decision` | POST | A | J,F,H,Q | 303,400,500 | back office, notification, audit |
| `/api/demo/seed` | POST | M | J | 403,500,503 | demo workspace, env |
| `/api/detection/status` | GET | A | - | default | detection, validation |
| `/api/evidence-graph` | GET | A | Q | default | evidence graph, reviewed outcomes |
| `/api/ml/benchmark` | GET, POST | A | J | default | ML validation, detection providers |
| `/api/ml/readiness` | GET | A | - | default | ML validation/readiness |
| `/api/ml/status` | GET | A | - | default | detection, ORI |
| `/api/status` | GET | M | - | default | public contracts, integration registry |
| `/api/trust-algorithm/run` | POST | A | J,F,H | 303,400,401,403,404,500 | core trust engine, Supabase |
| `/api/trust-events` | GET, POST | A | J,F,H | 201,400,401,500 | AI trust, audit, Supabase |
| `/api/trust-memory` | GET | A | - | default | reviewed outcomes, Trust Memory |
| `/api/trust-recovery` | POST | M | J | 400,500 | recovery engine, audit |

## Authentication, access and governance

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/access/governance` | GET | A | Q | 400,500 | shared access-governance helper |
| `/api/authorization/history` | GET | A | Q | 400,500 | shared access-governance helper |
| `/api/auth/logout` | GET, POST | S | - | 303 | auth replay, Supabase |
| `/api/auth/replay-event` | POST | S | J | 400,401 | auth replay, Supabase |
| `/api/auth/session-action` | POST | S | F | 303 | auth replay, MFA, Supabase |
| `/api/auth/session-expired` | POST | S | J | 400 | audit, Supabase |
| `/api/auth/turnstile` | POST | N | J | 400 | bot protection |
| `/api/governance/events` | GET | N | Q | default | operational-trust API |
| `/api/governance/routing` | GET, POST | A | J,Q | 400 | governance and policy engines |
| `/api/policies` | GET, POST | A | J,Q | 400 | governance and policy engines |
| `/api/trust/authorization` | GET | A | Q | 400,500 | shared access-governance helper |
| `/api/trust/thresholds` | GET, POST | A | J,Q | 400 | governance and policy engines |
| `/api/workflows/access-state` | GET | A | Q | 400,500 | shared access-governance helper |

## Agents, provenance and permissions

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/agents/[id]` | GET, PATCH | A | J,Q | 401,403,404,500 | AI trust, audit, Supabase |
| `/api/agents/activity` | GET | A | J,Q | 401,500 | admin auth, Supabase |
| `/api/agents/register` | POST | D/A | J,F,Q,H | as `/api/agents` | re-export of agents POST |
| `/api/agents` | GET, POST, PATCH, DELETE | A | J,F,Q,H | 201,400,401,500 | audit, Supabase |
| `/api/agents/verify` | POST | A | J | 400,401,404 | admin auth, Supabase |
| `/api/ai-governance/analyze` | POST | A,M | J,F,Q,H | 303,400,401,403,404,502,503 | AI provider policy/OpenAI, audit |
| `/api/ledger/subject/[id]` | GET | N | Q | default | trust ledger |
| `/api/permissions/check` | POST | N | J | 400,500 | agent registry, permissions firewall |
| `/api/provenance/report/[id]` | GET | S | Q | 401 | phase-one trust, Supabase |
| `/api/provenance` | GET, POST, PATCH, DELETE | A | J,Q | 201,400,401,500 | admin auth, Supabase |
| `/api/provenance/verify` | POST | S | J,F | 401,503 | provenance confidence, audit |

## Verification, evidence, replay and public proof

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/badges/verify` | POST | N | J | 400,500 | marketplace trust, audit |
| `/api/candidate/verify` | POST | S | J,F,H | 303,400,401,500,503 | phase-one trust, audit |
| `/api/embed/[id]` | GET | N | Q | default | public embeds, audit |
| `/api/evidence` | POST | S | J,F,H | 303,400,404,500 | Supabase |
| `/api/evidence/upload` | POST | A | J,F,H | 303,400,403,404,500,503 | billing limit, notification, monitoring |
| `/api/feed/public` | GET | N | - | default | public contracts, Supabase |
| `/api/public/profile/[id]` | GET | N | Q | default | public profile, audit |
| `/api/public/verify/[id]` | GET | N | Q | default | public verification, audit |
| `/api/receipts/[id]` | GET | N | Q | default | operational trust, receipt verification |
| `/api/registry/search` | GET | N | Q | default | public trust registry, Supabase |
| `/api/replay/[id]` | GET | N | Q | default | replay engine, operational trust |
| `/api/revocation/check` | POST | N | J | 400,500 | revocation engine, audit |
| `/api/seals/verify/[id]` | GET | N | Q | default | public trust seals, audit |
| `/api/verification/signals` | POST | S | J | 400,401 | session integrity, Supabase |
| `/api/verifiers` | GET, POST | S | J | 201,400,401,500 | verifier network, audit |
| `/api/verify/world` | POST | S | J | 400,401,500,501 | provider normalizer, security |

## Interview and session integrity

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/interview/analyze` | POST | S | J | 400,401,404,500 | Supabase |
| `/api/interview/create` | POST | S | J,F,H | 303,401,500,503 | trusted hiring, audit |
| `/api/interview/liveness` | POST | S | J | 401 | phase-one trust, audit |
| `/api/interview/report` | POST | S | J | 401 | hiring/phase-one trust, audit |
| `/api/recruiter/verify` | POST | S | J,F,H | 303,400,401,500,503 | receipts, audit, Supabase |
| `/api/session/integrity` | POST | S | J | 201,400,401,404,500 | session integrity, audit |
| `/api/session/risk` | POST | S | J | 400,401 | session integrity, Supabase |
| `/api/step-up` | POST | S | J | 400,401,500 | bot protection, audit |
| `/api/trust/hiring-score` | POST | S | J,F,H | 303,400,401,500 | trusted hiring, Supabase |

## Providers and integrations

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/integrations/ats/receipts/[id]/export` | POST | A | J,Q | 400,404,409,422,500 | ATS, service role |
| `/api/integrations/ats/webhook` | POST | W | J,H,P | 400,401,413,422,503 | ATS, bot protection, service role |
| `/api/providers` | GET, PATCH, PUT | A | J,Q | 400,401,500,503 | registry/readiness, Hopae |
| `/api/providers` | POST | W | J,H,P | 400,401,413,415,500,503 | callback security, Hopae persistence |

## Billing, commercial and support

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/billing/checkout` | POST | D/S | - | 307 | redirect to Stripe checkout route |
| `/api/client/summary` | GET | S | - | 401 | client portal, Supabase |
| `/api/developer/api-keys` | GET, POST | S | J | 201,400,401,500 | API-key service, Supabase |
| `/api/enterprise-access` | POST | N | J,F | 303,500 | bot protection, service-role insert |
| `/api/stripe/create-checkout-session` | POST | S | J | 303,500,503 | Stripe billing, service role |
| `/api/stripe/customer-portal` | POST | S | J | 303,503 | Stripe billing, service role |
| `/api/stripe/webhook` | POST | W | H,P | 400,413 | Stripe, monitoring, security |
| `/api/support/issues` | POST | S | J,F,H,P | 400,401,503 | monitoring, service role |
| `/api/team/invite` | POST | S | J | 400,401,403,500 | team access, audit |
| `/api/team/summary` | GET | S | - | 401 | team workspace, audit |
| `/api/waitlist` | POST | N | J | 400,500 | bot protection, database events |

## Trust APIs and runtime

| Endpoint | Methods | Access | Validation | Explicit statuses | Main dependencies |
| --- | --- | --- | --- | --- | --- |
| `/api/audit/export` | GET | N | Q,H | default | replay, operational trust, transparency |
| `/api/audit/summary` | GET | N | Q | default | replay, operational trust |
| `/api/compliance/export` | POST | N | J | 400,500 | compliance export, audit |
| `/api/health` | GET | N | - | default | public health contract |
| `/api/hpg/analyze` | POST | M | J | 400,500 | HPG engine, audit |
| `/api/origin/analyze` | POST | M | J | 400,500 | Origin DNA, audit |
| `/api/passports/[id]/decision` | POST | S | J,F,Q | 400,500 | trust score, database events |
| `/api/passports` | POST | S | J,F | 303,400,403,500 | billing, notification, verification |
| `/api/reality-twin/analyze` | POST | M | J | 400,500 | Reality Twin, audit |
| `/api/trust/alerts` | GET, POST, PATCH, DELETE | S | J,Q | 201,400,401,500 | Supabase |
| `/api/trust/authenticate` | POST | S | J | 401 | trust authentication, cache, events |
| `/api/trust/calculate` | POST | K | J | 401 plus default | trust API responses, phase-one trust |
| `/api/trust/certifications` | GET, POST, PATCH, DELETE | S | J,Q | 201,400,401,500 | Supabase |
| `/api/trust/check` | POST | K | J,P | 400,401 plus handled errors | trust engines, audit, Supabase |
| `/api/trust/decision` | POST | K | J,P | 400,401 plus handled errors | decision/policy engines, rate limit |
| `/api/trust/events` | GET, POST | S | J | 201,400,401 | event tracker, Supabase |
| `/api/trust/evidence` | GET | K | Q | handled JSON errors | evidence service, Supabase |
| `/api/trust/execute` | GET, POST | S | J,Q | 201,400,401,503 | runtime engine, Hopae, security |
| `/api/trust/explain` | GET | N | Q | default | decision/replay/evidence graph |
| `/api/trust/passport` | GET | K | Q | handled JSON errors | trust API responses, Supabase |
| `/api/trust/posture` | GET | N | Q | default | replay, operational trust |
| `/api/trust-reports` | POST | S | J,F | 400,500 | verification, security, Supabase |
| `/api/workflows/[id]/trust` | GET | N | Q | default | operational-trust API |

## Findings from the inventory

- Response and error schemas vary across `{ ok, error }`, redirects, domain payloads and uncaught/default behavior.
- Authentication is inconsistent by design and history: admin, session, API key, webhook and intentionally public paths coexist, while 34 routes expose no local guard before deeper/helper analysis.
- Middleware does not protect every `/api/*` route. Each handler remains responsible for its own boundary unless explicitly classified.
- Validation is predominantly handwritten; no repository-wide schema library is installed.
- Rate limiting is endpoint-specific and often process-local; no universal API gateway enforcement is source-defined.
- Route handlers frequently combine boundary, domain orchestration and persistence, bypassing the intended service/repository layering.
