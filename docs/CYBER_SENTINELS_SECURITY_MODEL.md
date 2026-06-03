# Cyber Sentinels Security Model

Last audited: 2026-06-03

## Authentication

Cyber Sentinels uses Supabase auth through the server client in `lib/supabase/server.ts`.
Unauthenticated users are redirected to login for protected workflows such as passport creation, passport viewing and admin operations.

## Admin Access

Admin access is layered:

- Authenticated Supabase session
- Email allowlist from `ADMIN_EMAILS`
- Verified admin cookie: `cyber_admin_verified`

The shared admin checks live in `lib/auth/isAdmin.ts`.

## Middleware Protection

`middleware.ts` protects:

- `/back-office`
- `/verification-queue`
- `/evidence-vault`
- `/decision-engine`
- `/mission-control`
- `/trust-graph-engine`
- `/trust-intelligence`
- `/api/admin/*`

Failed admin checks redirect to `/command-center` and clear the admin verification cookie.

## Data Protection

Operational tables use Supabase RLS migrations. Public anonymous access is revoked for sensitive tables such as:

- `decisions`
- `audit_logs`
- `signals`
- `help_questions`
- `trust_graph_nodes`
- `trust_graph_edges`

Authenticated access is granted for operational use, with stricter own-read or admin policies on newer tables such as `trust_assistant_questions` and `knowledge_articles`.

## Audit And Signals

Workflow actions write both audit events and signals where applicable. Admin access, decisions, evidence review, help answers, AI drafts and knowledge article lifecycle events are audit/signal tracked.

## AI Safety

AI is limited to admin-only answer drafts. It must use approved `knowledge_articles` only. Drafts are stored as draft state and are not shown to users until an admin approves the answer.
