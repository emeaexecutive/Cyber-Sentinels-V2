# Cyber Sentinels V1 Platform Audit

Last reviewed: 2026-06-03

V1 identity: **Evidence-backed trust infrastructure for governed verification and operational transparency.**

This audit is a consolidation pass. It does not recommend adding major systems before V1. The product spine should stay focused on Trust Passports, evidence upload, verification review, decisions, audit logs, signals, Trust Graph, notifications, appeals and enterprise trust positioning.

## Executive Status

| Area | Status | Notes |
| --- | --- | --- |
| Public onboarding | WORKING | `/`, `/demo`, `/enterprise-access`, `/how-to-use`, legal and trust pages are public. Demo does not require login. |
| Signup and login | WORKING | `/login` defaults to user passport flow. Email verification and magic links return through `/auth/callback`. |
| Password reset | WORKING | Reset now returns users to `/passport`, not Command Center. |
| Trust Passport creation | WORKING | `/passport` is authenticated and creates passport/verification records with audit/signal writes. |
| Trust Passport registry | WORKING | `/passports` is authenticated and filters to the current user's email. |
| Passport viewer | PARTIAL | Focused enough for V1, but still contains graph/timeline complexity that should remain simple in demo walkthroughs. |
| Evidence upload | WORKING | Authenticated upload, file validation and audit/signal/notification writes exist. New uploads no longer store public file URLs. |
| Evidence review | WORKING | Admin-only evidence decision API is protected and writes audit/signal events. |
| Admin decision flow | WORKING | Admin-only verification decision API is protected and writes decision, audit, signal and notification records. |
| Notifications | WORKING | User-owned notifications table and page exist. V1 should keep this simple. |
| Appeals | WORKING | User-owned appeals route/table and admin review API exist. |
| Trust Graph | PARTIAL | Useful for V1 as a readable relationship layer. Avoid network-graph or graph-engine language in public demos. |
| Help system | PARTIAL | Help and Trust Assistant exist; V1 should present Help as support/education, not autonomous AI. |
| Legal pages | WORKING | Draft legal, privacy, security and governance pages exist and are marked for review. |
| Developer platform | HIDDEN | Exists but is not part of the V1 spine. Keep out of public/user primary navigation. |
| AI agents/trust events | NOT READY FOR V1 | Foundation exists from earlier work, but should remain admin-hidden/future-roadmap for V1. |
| Reality/behavior future concepts | NOT READY FOR V1 | Multiple conceptual routes exist. Keep hidden from main navigation and demo story. |

## Route Audit

### Public Routes

| Routes | Status | V1 handling |
| --- | --- | --- |
| `/`, `/demo`, `/enterprise-access` | WORKING | Core public onboarding. |
| `/about`, `/how-to-use`, `/help`, `/security` | WORKING | Public education and support. |
| `/privacy`, `/terms`, `/cookies`, `/legal`, `/regulatory`, `/accessibility` | WORKING | Draft legal pages; keep visible in footer. |
| `/trust-principles`, `/ai-governance`, `/transparency` | WORKING | Public trust posture; keep calm and non-hype. |
| `/status` | PARTIAL | Public health page exists; checks depend on runtime Supabase availability. |
| `/developers`, `/developers/docs`, `/developers/authentication`, `/developers/trust-events` | HIDDEN | Developer layer exists but is not core V1. Do not promote in primary public nav. |
| Concept/future pages such as `/reality-*`, `/origin-*`, `/trust-fabric`, `/trust-registry`, `/human-presence-*` | NOT READY FOR V1 | Keep out of navigation. Treat as roadmap/concept only. |

### Authenticated User Routes

| Routes | Status | V1 handling |
| --- | --- | --- |
| `/passport`, `/passports`, `/passports/[id]` | WORKING | Core V1 user workflow. |
| `/evidence-upload` | WORKING | Core V1 evidence workflow. |
| `/notifications`, `/appeals` | WORKING | Core V1 communication and review workflow. |
| `/data-rights` | WORKING | Support/legal workflow; keep available. |
| `/knowledge-base`, `/trust-assistant` | PARTIAL | Useful support layer, but avoid AI-first positioning. |
| `/messages` | PARTIAL | Support messaging exists but is not in the V1 spine; keep secondary. |
| `/agents`, `/trust-events` | HIDDEN | Moved behind admin route protection for V1 consolidation. |
| `/developers/api-keys` | NOT READY FOR V1 | Authenticated developer capability exists; keep out of normal user navigation. |

### Admin Routes

| Routes | Status | V1 handling |
| --- | --- | --- |
| `/back-office` | TOO COMPLEX | Works, but remains dense. V1 demo should use Overview/Queue/Evidence/Decisions/Audit/Signals/Help/Intelligence tabs only. |
| `/verification-queue`, `/evidence-vault`, `/decision-engine` | WORKING | Core admin operation routes. |
| `/trust-graph-engine`, `/trust-intelligence` | PARTIAL | Admin-only intelligence routes. Use sparingly in V1 demo. |
| `/workforce-trust`, `/intent-verification`, `/autonomy-governance`, `/execution-passports`, `/state-verification` | HIDDEN | Governance modules exist but should not distract from the V1 spine. |
| `/agents`, `/trust-events`, `/admin/agents` | HIDDEN | AI trust pipeline foundation exists; keep admin-only/future for V1. |

### API Routes

| API group | Status | Notes |
| --- | --- | --- |
| `/api/auth/*` | WORKING | Logout/session expiry routes exist. |
| `/auth/callback` | WORKING | Exchanges Supabase code and redirects to safe next path or `/passport`. |
| `/api/evidence/upload` | WORKING | Authenticated, validates file type/size, writes audit/signal/notification. |
| `/api/admin/*` | WORKING | Middleware and shared admin utility require session, allowlist and admin verification cookie except the admin access endpoint. |
| `/api/passports`, `/api/passports/[id]/decision` | PARTIAL | Exists; review before exposing as public developer API. |
| `/api/trust-events`, `/api/agents*`, `/api/developer/api-keys` | NOT READY FOR V1 | Foundation exists but should stay outside the V1 story. |
| `/api/demo/seed` | HIDDEN | Demo seeding should not be part of public V1 narrative. |

## Supabase Tables

| Table | Status | V1 handling |
| --- | --- | --- |
| `passports` | WORKING | Core. |
| `verification_cases` | WORKING | Core. |
| `evidence_files` | WORKING | Core; storage bucket is now set private by launch consolidation migration. |
| `decisions` | WORKING | Core admin decision record. |
| `audit_logs` | WORKING | Core auditability. |
| `signals` | WORKING | Core operational signal trail. |
| `notifications` | WORKING | Core user updates. |
| `appeals` | WORKING | Core user review path. |
| `enterprise_access_requests` | WORKING | Public lead intake. |
| `help_questions`, `trust_assistant_questions`, `knowledge_articles` | PARTIAL | Support layer. Keep human-managed for V1. |
| `trust_graph_nodes`, `trust_graph_edges` | PARTIAL | Graph foundation. Keep readable and simple. |
| `agents`, `trust_events`, `agent_permissions`, `api_keys` | NOT READY FOR V1 | Future/developer foundations. Keep hidden/admin-only. |
| `intent_requests`, `autonomy_profiles`, `passport_state_checks`, `execution_passports` | HIDDEN | Governance foundations. Keep admin-only. |

## Core V1 Spine

| V1 capability | Status | Launch note |
| --- | --- | --- |
| Trust Passports | WORKING | User-facing heart of the product. |
| Evidence Upload | WORKING | Keep copy simple: upload evidence to continue verification. |
| Verification Review | WORKING | Admin review is separate and protected. |
| Decisions | WORKING | Human-governed admin decisions are recorded. |
| Audit Logs | WORKING | Explain as traceability, not surveillance. |
| Signals | WORKING | Explain as operational events, not scoring determinism. |
| Trust Graph | PARTIAL | Use as relationship visibility, not a chaotic graph engine. |
| Notifications | WORKING | User updates appear in a dedicated route. |
| Appeals | WORKING | User path exists for review of outcomes. |
| Enterprise Trust Positioning | WORKING | Homepage/demo/enterprise access align to governed trust. |

## Launch-Critical UX Review

| Flow | Status | Finding |
| --- | --- | --- |
| Signup | WORKING | Login copy is user-first and routes confirmation through `/auth/callback`. |
| Email verification | WORKING | Callback exchanges the `code` and redirects to `/passport` or safe `next`. |
| Login | WORKING | Normal user destination is `/passport` by default. |
| Logout | WORKING | Clears Supabase and admin cookies. |
| Password reset | WORKING | Reset now returns to `/passport`. |
| Create Passport | WORKING | Auth required. Public CTA routes through login with `next=/passport`. |
| Evidence upload | WORKING | Auth required; validates file and writes records. |
| Notifications | WORKING | Route/table exist; user nav exposes notifications. |
| Appeals | WORKING | Route/table exist; user nav exposes appeals. |
| Demo | WORKING | Public, static and private-data-free. |
| Enterprise access | WORKING | Public form writes to `enterprise_access_requests`. |

## Noise Reduction Decisions

- Public navigation now focuses on Home, Demo, How to Use, Security, Help and Login.
- Normal user navigation now focuses on Home, Create Passport, My Passports, Notifications, Appeals and Help.
- AI agents, trust events and developer tooling are not promoted in the V1 public/user nav.
- Admin navigation keeps operational V1 categories but removes Agent Registry and Trust Events from the primary Intelligence group.
- Future concepts should remain hidden, conceptual or roadmap-only until the V1 spine is stable.

## Remaining V1 Risks

| Risk | Status | Recommendation |
| --- | --- | --- |
| Back Office density | TOO COMPLEX | Continue collapsing advanced panels and prioritize pending reviews, evidence, decisions, signals and health. |
| Broad authenticated RLS on older operational tables | PARTIAL | See `docs/SECURITY_REVIEW.md`; tighten to owner/admin policies in the next security pass. |
| Legacy/future routes still present | HIDDEN | Routes build, but should not be linked in V1 demo or primary navigation. |
| Evidence viewing after private bucket change | PARTIAL | Upload remains safe; a signed download route would improve admin/user file viewing later without public exposure. |

