alter table public.enterprise_access_requests
add column if not exists current_problem_category text;
