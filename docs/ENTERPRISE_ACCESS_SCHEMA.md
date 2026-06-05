# Enterprise Access Schema

## Purpose

The `/enterprise-access` page is a public lead/request form for early partners and design collaborators. It does not require login.

The submit handler runs as a server action and uses a server-only Supabase service-role client so public visitors are not blocked by browser auth state or anonymous RLS drift.

## Public Access Behaviour

- Route: `/enterprise-access`
- Access: public
- Login required: no
- Success redirect: `/enterprise-access?success=true`
- Failure redirect: `/enterprise-access?error=submit_failed`
- Required-field redirect: `/enterprise-access?error=required`
- Design partner intent: `/enterprise-access?intent=design_partner`

The service role key is used only in server code through `lib/supabase/admin.ts`, which imports `server-only`. It must never be exposed to client components or browser code.

## Required Fields

The form requires:

- `name`
- `work_email`
- `company`

If any of these are missing, the handler redirects to `/enterprise-access?error=required`.

## Allowed Insert Fields

The submit handler uses a central allowed field list before inserting. This prevents future form fields from being sent to Supabase unless they are explicitly allowed.

Allowed insert fields:

- `name`
- `work_email`
- `company`
- `role`
- `company_size`
- `current_problem_category`
- `current_problem`
- `ai_usage_level`
- `use_case`
- `message`
- `design_partner_interest`
- `governance_interest`
- `operational_ai_interest`
- `status`

Default status:

- `new`

## Table Columns

Table: `public.enterprise_access_requests`

Expected columns:

- `id uuid primary key default gen_random_uuid()`
- `name text`
- `work_email text`
- `company text`
- `role text`
- `company_size text`
- `current_problem_category text`
- `current_problem text`
- `ai_usage_level text`
- `use_case text`
- `message text`
- `design_partner_interest boolean not null default false`
- `governance_interest boolean not null default false`
- `operational_ai_interest boolean not null default false`
- `status text default 'new'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

The migration `202606040002_ensure_enterprise_access_requests_public_submit.sql` is idempotent and ensures these columns exist.

## RLS Policy

RLS is enabled on `public.enterprise_access_requests`.

Policies:

- `public insert enterprise access requests`: allows anonymous inserts.
- `authenticated manage enterprise access requests`: allows authenticated management.

Even though anonymous insert is allowed by policy, the form submit handler uses the server-only service role client to avoid public submission failures caused by deployment schema or RLS drift.

## Logging

Supabase insert failures are logged server-side with:

```ts
console.error("enterprise access submit failed", {
  message: error.message,
  code: error.code,
  details: error.details,
});
```

These details should appear in Vercel server logs and are not shown to public visitors.
