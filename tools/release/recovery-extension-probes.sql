-- Local restored database only. Run as platform admin in a READ ONLY transaction.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $probe$
DECLARE r text; n bigint; other_rows bigint;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  EXECUTE format('SET LOCAL ROLE %I',r);
  IF has_function_privilege(current_user,'extensions.pg_stat_statements_reset(oid,oid,bigint,boolean)','EXECUTE') THEN
   RAISE EXCEPTION 'Stats reset unexpectedly executable by %',r;
  END IF;
  SELECT count(*) INTO other_rows FROM extensions.pg_stat_statements WHERE userid<>current_user::regrole;
  SELECT count(*) INTO n FROM extensions.pg_stat_statements
   WHERE userid<>current_user::regrole AND (queryid IS NOT NULL OR (query IS NOT NULL AND query<>'<insufficient privilege>'));
  IF n<>0 OR other_rows=0 THEN RAISE EXCEPTION 'Stats redaction probe failed or vacuous for %',r; END IF;
  SELECT count(*) INTO n FROM extensions.pg_stat_statements_info;
  IF n<>1 THEN RAISE EXCEPTION 'Stats info unavailable for %',r; END IF;
  IF encode(extensions.digest('recovery-probe','sha256'),'hex')<>encode(sha256(convert_to('recovery-probe','UTF8')),'hex') THEN RAISE EXCEPTION 'Digest dependency mismatch'; END IF;
  IF extensions.uuid_generate_v4() IS NULL THEN RAISE EXCEPTION 'UUID dependency failed'; END IF;
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'PASS: role %, stats text/queryid redaction, reset denial, stats-info, digest, UUID',r;
 END LOOP;
END $probe$;
ROLLBACK;
