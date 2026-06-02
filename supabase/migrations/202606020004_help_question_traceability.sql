-- Help Question Traceability

alter table public.help_questions
  add column if not exists created_by_user_id uuid,
  add column if not exists created_by_email text,
  add column if not exists created_by_name text,
  add column if not exists reply_channel text default 'in_app',
  add column if not exists admin_answered_by text,
  add column if not exists answered_at timestamptz;

alter table public.help_questions
  alter column status set default 'open',
  alter column reply_channel set default 'in_app';

update public.help_questions
set
  status = coalesce(status, 'open'),
  reply_channel = coalesce(reply_channel, 'in_app')
where status is null
  or reply_channel is null;

grant select, insert, update on table public.help_questions to authenticated;

alter table public.help_questions enable row level security;
