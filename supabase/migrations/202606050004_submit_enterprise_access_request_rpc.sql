create or replace function public.submit_enterprise_access_request(
  p_name text,
  p_email text,
  p_company text default null,
  p_role text default null,
  p_message text default null,
  p_use_case text default null,
  p_urgency text default null,
  p_company_size text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.enterprise_access_requests (
    name,
    work_email,
    company,
    role,
    message,
    use_case,
    ai_usage_level,
    company_size
  )
  values (
    p_name,
    p_email,
    p_company,
    p_role,
    p_message,
    p_use_case,
    p_urgency,
    p_company_size
  );
end;
$$;

grant execute on function public.submit_enterprise_access_request(
  text, text, text, text, text, text, text, text
) to anon, authenticated;
