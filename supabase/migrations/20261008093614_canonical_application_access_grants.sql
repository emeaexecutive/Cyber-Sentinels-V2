-- The trusted backend must have SQL privileges in addition to BYPASSRLS.
-- Older Production defaults granted maintenance privileges but omitted CRUD.
-- This reconciles backend access only; it never grants customer/anonymous access.
begin;
do $$
declare item record;
begin
  for item in
    select n.nspname,c.relname,c.relkind from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','S')
      and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
  loop
    if item.relkind='S' then
      execute format('grant usage, select, update on sequence %I.%I to service_role',item.nspname,item.relname);
    elsif item.relkind in ('v','m') then
      execute format('grant select on table %I.%I to service_role',item.nspname,item.relname);
    else
      execute format('grant select, insert, update, delete on table %I.%I to service_role',item.nspname,item.relname);
    end if;
  end loop;
end;
$$;
commit;
