alter table public.enterprise_access_requests enable row level security;

grant insert on table public.enterprise_access_requests to anon;
grant select, insert, update on table public.enterprise_access_requests to authenticated;
grant all privileges on table public.enterprise_access_requests to service_role;

grant insert (
  name,
  work_email,
  company,
  role,
  company_size,
  current_problem_category,
  current_problem,
  ai_usage_level,
  use_case,
  message,
  design_partner_interest,
  governance_interest,
  operational_ai_interest,
  status
) on public.enterprise_access_requests to anon;

drop policy if exists "public insert enterprise access requests" on public.enterprise_access_requests;

create policy "public insert enterprise access requests"
on public.enterprise_access_requests
for insert
to anon
with check (true);
