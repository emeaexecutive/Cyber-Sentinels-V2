-- Canonical Continuous Trust alerts persist provider-neutral database fields.
-- Legacy title/description values remain readable through repository translation,
-- but must not keep canonical alert inserts from succeeding.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trust_alerts' and column_name = 'title'
  ) then
    execute $sql$
      update public.trust_alerts
      set alert_title = coalesce(nullif(btrim(alert_title), ''), nullif(btrim(title), ''))
      where alert_title is null or btrim(alert_title) = ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trust_alerts' and column_name = 'description'
  ) then
    execute $sql$
      update public.trust_alerts
      set alert_description = coalesce(nullif(btrim(alert_description), ''), nullif(btrim(description), ''))
      where alert_description is null
    $sql$;
  end if;
end
$$;

update public.trust_alerts
set
  alert_title = coalesce(
    nullif(btrim(alert_title), ''),
    nullif(btrim(summary), ''),
    nullif(btrim(alert_type), ''),
    'Trust alert'
  ),
  alert_description = coalesce(
    nullif(btrim(alert_description), ''),
    nullif(btrim(summary), '')
  )
where alert_title is null
   or btrim(alert_title) = ''
   or alert_description is null;

alter table public.trust_alerts
  alter column alert_title set not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trust_alerts' and column_name = 'title'
  ) then
    alter table public.trust_alerts alter column title drop not null;
  end if;
end
$$;

comment on column public.trust_alerts.alert_title is
  'Canonical persisted alert title; translated to domain field title by the repository.';

comment on column public.trust_alerts.alert_description is
  'Canonical persisted alert description; translated to domain field description by the repository.';
