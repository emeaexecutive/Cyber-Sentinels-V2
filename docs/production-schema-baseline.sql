--
-- PostgreSQL database dump
--

\restrict Tcs1ZHWUPFNsiFjcTlkfTDGl0SZbD7HzeZ2brhbkxMrKRs6rXvIKOWYSOokcsvm

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: create_governance_action_if_needed("uuid", "text", "uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."create_governance_action_if_needed"("policy_id_input" "uuid", "subject_type_input" "text", "subject_id_input" "uuid", "status_input" "text", "notes_input" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  existing_id uuid;
begin
  if subject_id_input is null then
    return null;
  end if;

  select id into existing_id
  from public.governance_actions
  where policy_id = policy_id_input
    and subject_type = subject_type_input
    and subject_id = subject_id_input
    and action_status in ('pending', 'in_review', 'escalated')
  order by created_at desc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.governance_actions (
    policy_id,
    subject_type,
    subject_id,
    action_status,
    resolution_notes
  )
  values (
    policy_id_input,
    subject_type_input,
    subject_id_input,
    status_input,
    notes_input
  )
  returning id into existing_id;

  return existing_id;
end;
$$;


ALTER FUNCTION "public"."create_governance_action_if_needed"("policy_id_input" "uuid", "subject_type_input" "text", "subject_id_input" "uuid", "status_input" "text", "notes_input" "text") OWNER TO "postgres";

--
-- Name: ensure_governance_policy("text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."ensure_governance_policy"("policy_name" "text", "policy_description" "text", "policy_trigger_type" "text", "policy_severity" "text", "policy_action_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  existing_id uuid;
begin
  select id into existing_id
  from public.governance_policies
  where workspace_id is null
    and trigger_type = policy_trigger_type
    and action_type = policy_action_type
  order by created_at asc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.governance_policies (
    name,
    description,
    trigger_type,
    severity,
    action_type,
    requires_human_review
  )
  values (
    policy_name,
    policy_description,
    policy_trigger_type,
    policy_severity,
    policy_action_type,
    true
  )
  returning id into existing_id;

  return existing_id;
end;
$$;


ALTER FUNCTION "public"."ensure_governance_policy"("policy_name" "text", "policy_description" "text", "policy_trigger_type" "text", "policy_severity" "text", "policy_action_type" "text") OWNER TO "postgres";

--
-- Name: evidence_chain_record_integrity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."evidence_chain_record_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    new.subject_type,
    new.subject_id,
    'evidence_chain_created',
    'Evidence chain created',
    coalesce(
      nullif(new.chain_summary, ''),
      'An operational evidence chain was recorded for explainable trust review.'
    ),
    'evidence_chain_registry',
    null,
    row_data,
    'info',
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'evidence_chain_created',
    'evidence_chain_registry',
    jsonb_build_object(
      'evidence_chain_id', new.id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'operational_context', 'Evidence chain recorded to explain what supported the verification state.'
    ),
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  select
    'evidence_chain',
    new.id,
    'linked_to',
    new.subject_type,
    new.subject_id,
    'medium',
    'Evidence chain links this subject to reviewable operational evidence, signals and governance records.',
    coalesce(new.created_at, now())
  where new.subject_id is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'evidence_chain'
        and existing.source_id = new.id
        and existing.relationship_type = 'linked_to'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."evidence_chain_record_integrity"() OWNER TO "postgres";

--
-- Name: governance_from_agent_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."governance_from_agent_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_id_value uuid;
  activity_text text := lower(
    coalesce(new.activity_type, '') || ' ' ||
    coalesce(new.review_status, '') || ' ' ||
    coalesce(new.signed_action_ref, '') || ' ' ||
    coalesce(new.provenance_ref, '')
  );
begin
  if activity_text like '%suspicious%'
    or activity_text like '%unknown%'
    or activity_text like '%unsigned%'
    or activity_text like '%escalat%'
    or activity_text like '%review%' then
    policy_id_value := public.ensure_governance_policy(
      'Suspicious agent activity review',
      'Agent activity indicates suspicious or high-risk behavior and requires human governance review.',
      'suspicious_agent_activity_detected',
      'high',
      'agent_activity_review'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      'agent',
      new.agent_id,
      'escalated',
      coalesce(new.activity_type, 'Suspicious or high-risk agent activity detected.')
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."governance_from_agent_activity"() OWNER TO "postgres";

--
-- Name: governance_from_ai_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."governance_from_ai_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_id_value uuid;
  row_data jsonb := to_jsonb(new);
  subject_type_value text;
  subject_id_value uuid;
begin
  if new.event_type in (
    'governance_recommendation_created',
    'anomaly_review_recommended'
  ) then
    subject_type_value := public.trust_timeline_subject_type(row_data);
    subject_id_value := public.trust_timeline_subject_id(row_data);
    policy_id_value := public.ensure_governance_policy(
      'AI-assisted escalation review',
      'AI-assisted analysis recommended review or escalation. Human governance remains authoritative.',
      'ai_assisted_escalation_recommended',
      case when new.event_type = 'anomaly_review_recommended' then 'high' else 'medium' end,
      'human_review_required'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      subject_type_value,
      subject_id_value,
      case when new.event_type = 'anomaly_review_recommended' then 'escalated' else 'pending' end,
      'AI-assisted recommendation requires human governance review.'
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."governance_from_ai_audit"() OWNER TO "postgres";

--
-- Name: governance_from_case_missing_evidence(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."governance_from_case_missing_evidence"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_id_value uuid;
begin
  if lower(coalesce(new.title, '') || ' ' || coalesce(new.description, '')) like '%missing evidence%'
    or lower(coalesce(new.title, '') || ' ' || coalesce(new.description, '')) like '%evidence missing%'
    or new.status = 'escalated' then
    policy_id_value := public.ensure_governance_policy(
      'Missing evidence escalation',
      'A workflow appears to be missing required evidence or has been escalated for evidence review.',
      'missing_evidence_escalation',
      case when new.status = 'escalated' then 'high' else 'medium' end,
      'request_evidence'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      'trust_case',
      new.id,
      case when new.status = 'escalated' then 'escalated' else 'pending' end,
      'Evidence completeness needs human review.'
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."governance_from_case_missing_evidence"() OWNER TO "postgres";

--
-- Name: governance_from_signal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."governance_from_signal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_id_value uuid;
  row_data jsonb := to_jsonb(new);
  subject_type_value text;
  subject_id_value uuid;
begin
  if lower(coalesce(new.event, '')) like '%risk%'
    or lower(coalesce(new.event, '')) like '%review%'
    or lower(coalesce(new.event, '')) like '%escalat%'
    or lower(coalesce(new.event, '')) like '%anomaly%' then
    subject_type_value := public.trust_timeline_subject_type(row_data);
    subject_id_value := public.trust_timeline_subject_id(row_data);
    policy_id_value := public.ensure_governance_policy(
      'Unresolved signal review',
      'A signal indicates unresolved risk or review need and requires human governance review.',
      'unresolved_signal_detected',
      'medium',
      'signal_review'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      subject_type_value,
      subject_id_value,
      'pending',
      new.event
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."governance_from_signal"() OWNER TO "postgres";

--
-- Name: governance_from_trust_algorithm_run(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."governance_from_trust_algorithm_run"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_id_value uuid;
begin
  if coalesce(new.score, 100) < 60 then
    policy_id_value := public.ensure_governance_policy(
      'Trust score threshold review',
      'Trust score fell below the operational review threshold and requires human governance review.',
      'trust_score_below_threshold',
      'high',
      'review_required'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      new.subject_type,
      new.subject_id,
      'pending',
      coalesce(new.explanation, 'Deterministic trust score is below threshold.')
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."governance_from_trust_algorithm_run"() OWNER TO "postgres";

--
-- Name: hiring_risk_event_records(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."hiring_risk_event_records"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  session_row public.interview_sessions%rowtype;
  actor_id uuid;
  policy_id_value uuid;
  governance_action_id uuid;
begin
  select * into session_row
  from public.interview_sessions
  where id = new.interview_session_id;

  actor_id := session_row.user_id;

  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    'interview_session',
    new.interview_session_id,
    'interview_risk_event',
    'Interview risk event recorded',
    coalesce(new.risk_reason, 'A placeholder interview integrity signal was recorded for human review.'),
    'system',
    actor_id,
    jsonb_build_object(
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'confidence_score', new.confidence_score,
      'escalation_required', new.escalation_required,
      'explainability', 'Placeholder signal only. No detection accuracy is claimed.'
    ),
    case when new.escalation_required then 'review' else 'info' end,
    new.created_at
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'interview_risk_event_recorded',
    coalesce(actor_id::text, 'system'),
    jsonb_build_object(
      'interview_session_id', new.interview_session_id,
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'risk_reason', new.risk_reason,
      'escalation_required', new.escalation_required
    ),
    new.created_at
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  values (
    'interview_risk_event',
    new.id,
    'generated_signal',
    'interview_session',
    new.interview_session_id,
    'medium',
    'Interview risk event is linked to the session for explainable hiring integrity review.',
    new.created_at
  );

  if new.escalation_required then
    select id into policy_id_value
    from public.governance_policies
    where trigger_type in ('interview_integrity_escalation', 'high-risk signal review', 'high_risk_signal_review')
    order by created_at desc
    limit 1;

    insert into public.governance_actions (
      policy_id,
      subject_type,
      subject_id,
      action_status,
      assigned_to,
      resolution_notes,
      created_at
    )
    values (
      policy_id_value,
      'interview_session',
      new.interview_session_id,
      'pending',
      actor_id,
      coalesce(new.risk_reason, 'Interview risk event requires human governance review.'),
      new.created_at
    )
    returning id into governance_action_id;

    insert into public.notifications (
      user_id,
      notification_type,
      title,
      message,
      body,
      severity,
      read,
      is_read,
      metadata,
      created_at
    )
    values (
      actor_id,
      'interview_integrity_review',
      'Interview integrity review required',
      'An interview risk event was escalated for human review.',
      'An interview risk event was escalated for human review.',
      'review',
      false,
      false,
      jsonb_build_object(
        'subject_type', 'interview_session',
        'subject_id', new.interview_session_id,
        'interview_risk_event_id', new.id,
        'governance_action_id', governance_action_id,
        'email_ready', false
      ),
      new.created_at
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."hiring_risk_event_records"() OWNER TO "postgres";

--
-- Name: notification_insert("uuid", "text", "text", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notification_insert"("target_user_id" "uuid", "notification_kind" "text", "notification_title" "text", "notification_message" "text", "notification_severity" "text" DEFAULT 'info'::"text", "notification_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    notification_type,
    title,
    message,
    body,
    severity,
    read,
    is_read,
    metadata,
    created_at
  )
  values (
    target_user_id,
    notification_kind,
    notification_title,
    notification_message,
    notification_message,
    coalesce(notification_severity, 'info'),
    false,
    false,
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object('email_ready', false),
    now()
  );

  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    coalesce(notification_metadata ->> 'subject_type', 'notification'),
    public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id'),
    'notification_created',
    notification_title,
    notification_message,
    'system',
    target_user_id,
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object('notification_type', notification_kind),
    coalesce(notification_severity, 'info'),
    now()
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'notification_created',
    'system',
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object(
      'user_id', target_user_id,
      'notification_type', notification_kind,
      'title', notification_title
    ),
    now()
  );

  if public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id') is not null then
    insert into public.trust_relationships (
      source_type,
      source_id,
      relationship_type,
      target_type,
      target_id,
      confidence_level,
      explanation,
      created_at
    )
    select
      'notification',
      notifications.id,
      'notifies_about',
      coalesce(notification_metadata ->> 'subject_type', 'operational_record'),
      public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id'),
      'high',
      'Notification was created to coordinate human review for the linked operational trust record.',
      now()
    from public.notifications
    where notifications.user_id = target_user_id
      and notifications.notification_type = notification_kind
      and notifications.title = notification_title
    order by notifications.created_at desc
    limit 1;
  end if;
end;
$$;


ALTER FUNCTION "public"."notification_insert"("target_user_id" "uuid", "notification_kind" "text", "notification_title" "text", "notification_message" "text", "notification_severity" "text", "notification_metadata" "jsonb") OWNER TO "postgres";

--
-- Name: notify_ai_recommendation_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notify_ai_recommendation_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.event_type not in (
    'governance_recommendation_created',
    'anomaly_review_recommended',
    'ai_summary_generated'
  ) then
    return new;
  end if;

  perform public.notification_insert(
    public.trust_timeline_safe_uuid(new.metadata ->> 'assigned_to'),
    'ai_recommendation_review',
    'AI-assisted recommendation needs review',
    'An AI-assisted operational recommendation is available for human review.',
    'review',
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'subject_type', coalesce(new.metadata ->> 'subject_type', 'governance'),
      'subject_id', new.metadata ->> 'subject_id',
      'audit_log_id', new.id,
      'coordination_trigger', 'ai_recommendation_review'
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_ai_recommendation_audit"() OWNER TO "postgres";

--
-- Name: notify_governance_action_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notify_governance_action_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.notification_insert(
    new.assigned_to,
    'governance_review_assigned',
    'Governance review assigned',
    'A governance review has been assigned for human review.',
    case when lower(coalesce(new.action_status, 'pending')) = 'escalated' then 'review' else 'info' end,
    jsonb_build_object(
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'action_status', new.action_status,
      'coordination_trigger', 'governance_assignment'
    )
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."notify_governance_action_insert"() OWNER TO "postgres";

--
-- Name: notify_governance_action_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notify_governance_action_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    perform public.notification_insert(
      new.assigned_to,
      'governance_review_assigned',
      'Governance review reassigned',
      'A governance review has been reassigned for human review.',
      'info',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'previous_assigned_to', old.assigned_to,
        'assigned_to', new.assigned_to,
        'coordination_trigger', 'governance_reassignment'
      )
    );
  end if;

  if new.action_status = 'escalated' and new.action_status is distinct from old.action_status then
    perform public.notification_insert(
      new.assigned_to,
      'governance_escalation',
      'Governance action escalated',
      'A governance workflow was escalated and may require coordinated review.',
      'review',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'previous_status', old.action_status,
        'action_status', new.action_status,
        'coordination_trigger', 'governance_escalation'
      )
    );
  end if;

  if new.action_status = 'in_review'
     and new.resolution_notes ilike '%evidence%'
     and (new.action_status is distinct from old.action_status
          or new.resolution_notes is distinct from old.resolution_notes) then
    perform public.notification_insert(
      new.assigned_to,
      'evidence_request',
      'Additional evidence may be required',
      'A reviewer requested more evidence before the workflow can move forward.',
      'review',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'coordination_trigger', 'evidence_request'
      )
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_governance_action_update"() OWNER TO "postgres";

--
-- Name: notify_suspicious_agent_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notify_suspicious_agent_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  owner_id uuid;
begin
  if lower(coalesce(new.review_status, '')) not in ('suspicious', 'unknown', 'requires_review', 'high_risk')
     and lower(coalesce(new.activity_type, '')) not like '%suspicious%' then
    return new;
  end if;

  select owner_user_id into owner_id
  from public.ai_agents
  where id = new.agent_id;

  perform public.notification_insert(
    owner_id,
    'suspicious_agent_activity',
    'Agent activity requires review',
    'An AI agent activity record may require human operational review.',
    'review',
    jsonb_build_object(
      'subject_type', 'agent',
      'subject_id', new.agent_id,
      'agent_activity_id', new.id,
      'activity_type', new.activity_type,
      'review_status', new.review_status,
      'coordination_trigger', 'suspicious_agent_activity'
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_suspicious_agent_activity"() OWNER TO "postgres";

--
-- Name: notify_trust_case_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."notify_trust_case_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    perform public.notification_insert(
      new.assigned_to,
      'trust_case_reviewer_assigned',
      'Trust case assigned',
      coalesce(new.title, 'A trust case') || ' was assigned for operational review.',
      'info',
      jsonb_build_object(
        'subject_type', 'trust_case',
        'subject_id', new.id,
        'workspace_id', new.workspace_id,
        'previous_assigned_to', old.assigned_to,
        'assigned_to', new.assigned_to,
        'coordination_trigger', 'case_assignment'
      )
    );
  end if;

  if new.status = 'escalated' and new.status is distinct from old.status then
    perform public.notification_insert(
      coalesce(new.assigned_to, new.created_by),
      'trust_case_escalation',
      'Trust case escalated',
      coalesce(new.title, 'A trust case') || ' was escalated for coordinated review.',
      'review',
      jsonb_build_object(
        'subject_type', 'trust_case',
        'subject_id', new.id,
        'workspace_id', new.workspace_id,
        'previous_status', old.status,
        'status', new.status,
        'coordination_trigger', 'case_escalation'
      )
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_trust_case_update"() OWNER TO "postgres";

--
-- Name: operational_intelligence_from_agent_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."operational_intelligence_from_agent_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  normalized_activity text := lower(coalesce(new.activity_type, ''));
begin
  if normalized_activity not like '%suspicious%'
    and normalized_activity not like '%risk%'
    and normalized_activity not like '%unknown%'
    and normalized_activity not like '%failed%'
  then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    null,
    'agent',
    new.agent_id,
    'suspicious_agent_activity',
    'review',
    'Agent activity wording indicates possible suspicious or unresolved operational context.',
    'Review agent verification state, owner relationship, activity provenance and governance controls.',
    true,
    jsonb_build_object(
      'agent_activity_id', new.id,
      'activity_type', new.activity_type,
      'why_it_exists', 'Agent activity type contains suspicious, risk, unknown or failed wording.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.subject_type = 'agent'
      and existing.subject_id = new.agent_id
      and existing.metadata ->> 'agent_activity_id' = new.id::text
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."operational_intelligence_from_agent_activity"() OWNER TO "postgres";

--
-- Name: operational_intelligence_from_governance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."operational_intelligence_from_governance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_workspace uuid;
  normalized_status text := lower(coalesce(new.action_status, 'pending'));
begin
  if normalized_status not in ('pending', 'in_review', 'escalated') then
    return new;
  end if;

  select workspace_id into policy_workspace
  from public.governance_policies
  where id = new.policy_id;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    policy_workspace,
    new.subject_type,
    new.subject_id,
    case when normalized_status = 'escalated' then 'repeated_escalations' else 'unresolved_governance_action' end,
    case when normalized_status = 'escalated' then 'high' else 'review' end,
    'A governance action remains unresolved and may affect workflow health.',
    'Assign a human reviewer, confirm related evidence and resolve or defer the governance action.',
    true,
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'action_status', new.action_status,
      'why_it_exists', 'Governance action is pending, in review or escalated.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.event_type in ('unresolved_governance_action', 'repeated_escalations')
      and existing.subject_type is not distinct from new.subject_type
      and existing.subject_id is not distinct from new.subject_id
      and existing.metadata ->> 'governance_action_id' = new.id::text
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."operational_intelligence_from_governance"() OWNER TO "postgres";

--
-- Name: operational_intelligence_from_interview_risk(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."operational_intelligence_from_interview_risk"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not coalesce(new.escalation_required, false) and coalesce(new.confidence_score, 0) < 50 then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    interview_sessions.workspace_id,
    'interview_session',
    new.interview_session_id,
    'elevated_risk_pattern',
    case when coalesce(new.escalation_required, false) then 'high' else 'review' end,
    'An interview integrity signal requires explainable operational review.',
    'Review the signal source, candidate provenance, recruiter state and governance action before deciding.',
    true,
    jsonb_build_object(
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'confidence_score', new.confidence_score,
      'why_it_exists', 'Interview risk event was escalated or crossed the review confidence threshold.'
    ),
    now()
  from public.interview_sessions
  where interview_sessions.id = new.interview_session_id
    and not exists (
      select 1
      from public.operational_intelligence_events existing
      where existing.subject_type = 'interview_session'
        and existing.subject_id = new.interview_session_id
        and existing.metadata ->> 'interview_risk_event_id' = new.id::text
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."operational_intelligence_from_interview_risk"() OWNER TO "postgres";

--
-- Name: operational_intelligence_from_trust_case(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."operational_intelligence_from_trust_case"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  normalized_status text := lower(coalesce(new.status, 'open'));
begin
  if normalized_status not in ('open', 'in_review', 'escalated') then
    return new;
  end if;

  if normalized_status <> 'escalated'
    and coalesce(new.created_at, now()) > now() - interval '7 days'
  then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    new.workspace_id,
    'trust_case',
    new.id,
    case when normalized_status = 'escalated' then 'repeated_escalations' else 'stalled_verification_workflow' end,
    case when normalized_status = 'escalated' then 'high' else 'info' end,
    case
      when normalized_status = 'escalated' then 'A trust case is escalated and needs coordinated human review.'
      else 'A trust case has remained open or in review for at least seven days.'
    end,
    'Review case evidence, owner assignment, governance actions and next operational step.',
    normalized_status = 'escalated',
    jsonb_build_object(
      'trust_case_id', new.id,
      'status', new.status,
      'priority', new.priority,
      'why_it_exists', 'Trust case entered or remained in an active operational state.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.subject_type = 'trust_case'
      and existing.subject_id = new.id
      and existing.event_type in ('stalled_verification_workflow', 'repeated_escalations')
      and existing.metadata ->> 'status' = new.status
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."operational_intelligence_from_trust_case"() OWNER TO "postgres";

--
-- Name: operational_intelligence_record_integrity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."operational_intelligence_record_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    coalesce(new.subject_type, 'workflow'),
    new.subject_id,
    'operational_intelligence_event',
    coalesce(nullif(new.event_type, ''), 'Operational intelligence event'),
    coalesce(nullif(new.summary, ''), 'Operational intelligence was recorded for human review.'),
    'operational_intelligence',
    null,
    row_data,
    coalesce(nullif(new.severity, ''), 'info'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'operational_intelligence_event',
    'operational_intelligence',
    jsonb_build_object(
      'operational_intelligence_event_id', new.id,
      'workspace_id', new.workspace_id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'event_type', new.event_type,
      'severity', new.severity,
      'requires_review', new.requires_review,
      'operational_context', 'Explainable intelligence event recorded for workflow awareness and human governance.'
    ),
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  select
    'operational_intelligence_event',
    new.id,
    'linked_to',
    new.subject_type,
    new.subject_id,
    coalesce(nullif(new.severity, ''), 'medium'),
    'Operational intelligence links this subject to explainable workflow health, governance or risk context.',
    coalesce(new.created_at, now())
  where new.subject_id is not null
    and new.subject_type is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'operational_intelligence_event'
        and existing.source_id = new.id
        and existing.relationship_type = 'linked_to'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."operational_intelligence_record_integrity"() OWNER TO "postgres";

--
-- Name: prevent_cookie_consent_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."prevent_cookie_consent_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    raise exception using errcode = '42501', message = 'cookie consent receipts are append-only';
end;
$$;


ALTER FUNCTION "public"."prevent_cookie_consent_mutation"() OWNER TO "postgres";

--
-- Name: record_cookie_consent("uuid", "uuid", "text", boolean, boolean, boolean, "text", "uuid", "text", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_cookie_consent"("p_anonymous_id" "uuid", "p_session_id" "uuid", "p_consent_version" "text", "p_analytics" boolean, "p_marketing" boolean, "p_preferences" boolean, "p_source" "text", "p_idempotency_key" "uuid", "p_country_code" "text" DEFAULT NULL::"text", "p_ip_hash" "text" DEFAULT NULL::"text", "p_user_agent_hash" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("receipt_id" "uuid", "persisted_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
    v_existing public.cookie_consent_receipts%rowtype;
    v_row public.cookie_consent_receipts%rowtype;
begin
    if p_anonymous_id is null or p_idempotency_key is null then
        raise exception using errcode = '22023', message = 'anonymous_id and idempotency_key are required';
    end if;
    if p_consent_version is null or length(p_consent_version) < 1 or length(p_consent_version) > 100 then
        raise exception using errcode = '22023', message = 'invalid consent version';
    end if;
    if p_source not in ('cookie_banner','cookie_preferences','api') then
        raise exception using errcode = '22023', message = 'invalid consent source';
    end if;
    if p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then
        raise exception using errcode = '22023', message = 'invalid country code';
    end if;
    if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
        raise exception using errcode = '22023', message = 'metadata must be an object';
    end if;

    select * into v_existing
    from public.cookie_consent_receipts
    where idempotency_key = p_idempotency_key;

    if found then
        return query select v_existing.id, v_existing.created_at;
        return;
    end if;

    insert into public.cookie_consent_receipts (
        user_id,
        anonymous_id,
        session_id,
        consent_version,
        necessary,
        analytics,
        marketing,
        preferences,
        source,
        country_code,
        ip_hash,
        user_agent_hash,
        idempotency_key,
        metadata
    ) values (
        auth.uid(),
        p_anonymous_id,
        p_session_id,
        p_consent_version,
        true,
        coalesce(p_analytics, false),
        coalesce(p_marketing, false),
        coalesce(p_preferences, false),
        p_source,
        p_country_code,
        p_ip_hash,
        p_user_agent_hash,
        p_idempotency_key,
        coalesce(p_metadata, '{}'::jsonb)
    ) returning * into v_row;

    return query select v_row.id, v_row.created_at;
end;
$_$;


ALTER FUNCTION "public"."record_cookie_consent"("p_anonymous_id" "uuid", "p_session_id" "uuid", "p_consent_version" "text", "p_analytics" boolean, "p_marketing" boolean, "p_preferences" boolean, "p_source" "text", "p_idempotency_key" "uuid", "p_country_code" "text", "p_ip_hash" "text", "p_user_agent_hash" "text", "p_metadata" "jsonb") OWNER TO "postgres";

--
-- Name: record_governance_action_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_governance_action_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  policy_row public.governance_policies%rowtype;
begin
  select * into policy_row from public.governance_policies where id = new.policy_id;

  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    new.subject_type,
    new.subject_id,
    'governance_action_created',
    'Governance action created',
    coalesce(policy_row.description, 'A governance policy created a human review action.'),
    'governance_engine',
    new.assigned_to,
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'policy_name', policy_row.name,
      'trigger_type', policy_row.trigger_type,
      'action_type', policy_row.action_type,
      'resolution_notes', new.resolution_notes
    ),
    case when coalesce(policy_row.severity, 'medium') in ('high', 'critical') then 'review' else 'info' end,
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  values (
    'governance_policy',
    new.policy_id,
    'escalated_to',
    coalesce(new.subject_type, 'workflow'),
    new.subject_id,
    coalesce(policy_row.severity, 'medium'),
    coalesce(policy_row.description, 'Governance policy triggered human review.'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'governance_action_created',
    'governance_engine',
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'status', new.action_status
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."record_governance_action_created"() OWNER TO "postgres";

--
-- Name: record_governance_action_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_governance_action_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.action_status is distinct from new.action_status
    or old.resolution_notes is distinct from new.resolution_notes then
    insert into public.trust_timeline_events (
      subject_type,
      subject_id,
      event_type,
      event_title,
      event_summary,
      actor_type,
      actor_id,
      metadata,
      severity,
      created_at
    )
    values (
      new.subject_type,
      new.subject_id,
      'governance_decision_flow_updated',
      'Governance decision flow updated',
      'A human reviewer updated the governance action status or resolution notes.',
      'human_reviewer',
      new.assigned_to,
      jsonb_build_object(
        'governance_action_id', new.id,
        'policy_id', new.policy_id,
        'previous_status', old.action_status,
        'new_status', new.action_status,
        'resolution_notes', new.resolution_notes
      ),
      case when new.action_status = 'escalated' then 'review' else 'info' end,
      now()
    );

    insert into public.audit_logs (event_type, actor, metadata, created_at)
    values (
      'governance_action_updated',
      coalesce(new.assigned_to::text, 'human_reviewer'),
      jsonb_build_object(
        'governance_action_id', new.id,
        'policy_id', new.policy_id,
        'previous_status', old.action_status,
        'new_status', new.action_status,
        'resolution_notes', new.resolution_notes
      ),
      now()
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."record_governance_action_updated"() OWNER TO "postgres";

--
-- Name: record_trust_case_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_trust_case_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    'trust_case',
    new.id,
    'trust_case_created',
    'Trust case created',
    'A trust operations case was opened for collaborative governance review.',
    'workspace_user',
    new.created_by,
    to_jsonb(new),
    case when new.priority in ('high', 'urgent') or new.status = 'escalated' then 'review' else 'info' end,
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'trust_case_created',
    coalesce(new.created_by::text, 'workspace'),
    jsonb_build_object(
      'trust_case_id', new.id,
      'workspace_id', new.workspace_id,
      'status', new.status,
      'priority', new.priority
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."record_trust_case_created"() OWNER TO "postgres";

--
-- Name: record_trust_case_relationship_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."record_trust_case_relationship_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    'trust_case',
    new.case_id,
    'trust_case_relationship_created',
    'Trust case relationship created',
    'A case was linked to operational trust evidence, signals, timelines, agents or governance records.',
    'workspace_user',
    new.created_by,
    to_jsonb(new),
    'info',
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  values (
    'trust_case',
    new.case_id,
    coalesce(new.relationship_type, 'linked_to'),
    new.target_type,
    new.target_id,
    'high',
    coalesce(new.explanation, 'Trust case relationship created from workspace case management.'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'trust_case_relationship_created',
    coalesce(new.created_by::text, 'workspace'),
    jsonb_build_object(
      'trust_case_id', new.case_id,
      'target_type', new.target_type,
      'target_id', new.target_id,
      'relationship_type', new.relationship_type
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."record_trust_case_relationship_created"() OWNER TO "postgres";

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

--
-- Name: submit_enterprise_access_request("text", "text", "text", "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."submit_enterprise_access_request"("p_name" "text", "p_email" "text", "p_company" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_message" "text" DEFAULT NULL::"text", "p_use_case" "text" DEFAULT NULL::"text", "p_urgency" "text" DEFAULT NULL::"text", "p_company_size" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."submit_enterprise_access_request"("p_name" "text", "p_email" "text", "p_company" "text", "p_role" "text", "p_message" "text", "p_use_case" "text", "p_urgency" "text", "p_company_size" "text") OWNER TO "postgres";

--
-- Name: trust_receipt_record_integrity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_receipt_record_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    new.subject_type,
    new.subject_id,
    'verification_receipt_issued',
    'Verification receipt issued',
    coalesce(
      nullif(new.receipt_summary, ''),
      'A verification receipt was issued for explainable operational review.'
    ),
    'human_governance',
    new.issued_by,
    row_data,
    case
      when lower(coalesce(new.confidence_level, '')) in ('low', 'elevated risk', 'review') then 'review'
      else 'info'
    end,
    coalesce(new.issued_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'verification_receipt_issued',
    coalesce(new.issued_by::text, 'verification_receipt_registry'),
    jsonb_build_object(
      'receipt_id', new.id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'receipt_type', new.receipt_type,
      'verification_status', new.verification_status,
      'confidence_level', new.confidence_level,
      'operational_context', 'Explainable verification receipt recorded for governance traceability.'
    ),
    coalesce(new.issued_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  select
    'verification_receipt',
    new.id,
    'verified_by',
    new.subject_type,
    new.subject_id,
    coalesce(nullif(new.confidence_level, ''), 'medium'),
    'Verification receipt links this subject to the evidence and human-governance context that supported the review.',
    coalesce(new.issued_at, now())
  where new.subject_id is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'verification_receipt'
        and existing.source_id = new.id
        and existing.relationship_type = 'verified_by'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."trust_receipt_record_integrity"() OWNER TO "postgres";

--
-- Name: trust_timeline_actor_id("jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_actor_id"("row_data" "jsonb") RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.trust_timeline_safe_uuid(coalesce(
    nullif(row_data ->> 'actor_id', ''),
    nullif(row_data ->> 'reviewed_by', ''),
    nullif(row_data -> 'metadata' ->> 'actor_id', ''),
    nullif(row_data -> 'metadata' ->> 'user_id', ''),
    nullif(row_data -> 'metadata' ->> 'owner_user_id', '')
  ));
$$;


ALTER FUNCTION "public"."trust_timeline_actor_id"("row_data" "jsonb") OWNER TO "postgres";

--
-- Name: trust_timeline_record_agent_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_agent_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'agent_activity_detected',
    coalesce(nullif(row_data ->> 'activity_type', ''), 'Agent activity detected'),
    'Agent activity was recorded for provenance and human governance visibility.',
    'agent',
    case when lower(coalesce(row_data ->> 'risk_level', '')) in ('high', 'critical') then 'review' else 'info' end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_agent_activity"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_algorithm_run(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_algorithm_run"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'trust_score_updated',
    'Trust score updated',
    'The deterministic trust algorithm recalculated the subject trust status.',
    'trust_algorithm_v1',
    case when lower(coalesce(row_data ->> 'confidence_level', '')) like '%risk%' then 'review' else 'info' end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_algorithm_run"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
  audit_type text := lower(coalesce(new.event_type, ''));
begin
  if audit_type in (
    'ai_summary_generated',
    'governance_recommendation_created',
    'anomaly_review_recommended'
  ) then
    perform public.trust_timeline_record_event(
      row_data,
      new.event_type,
      case
        when audit_type = 'ai_summary_generated' then 'AI-assisted summary generated'
        when audit_type = 'governance_recommendation_created' then 'Governance recommendation created'
        else 'Anomaly review recommended'
      end,
      'AI-assisted analysis produced operational context for human governance review. AI does not rewrite history.',
      coalesce(new.actor, 'ai_governance_assistant'),
      case when audit_type = 'anomaly_review_recommended' then 'review' else 'info' end
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_audit"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_decision(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_decision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'governance_decision',
    'Governance decision recorded',
    'A human governance decision was recorded against the workflow.',
    coalesce(nullif(row_data ->> 'actor', ''), 'human_reviewer'),
    case when lower(coalesce(row_data ->> 'decision', '')) in ('deny', 'manual_review', 'needs_more_evidence') then 'review' else 'info' end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_decision"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_event("jsonb", "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_event"("row_data" "jsonb", "timeline_event_type" "text", "timeline_title" "text", "timeline_summary" "text", "timeline_actor_type" "text" DEFAULT 'system'::"text", "timeline_severity" "text" DEFAULT 'info'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    public.trust_timeline_subject_type(row_data),
    public.trust_timeline_subject_id(row_data),
    timeline_event_type,
    timeline_title,
    timeline_summary,
    timeline_actor_type,
    public.trust_timeline_actor_id(row_data),
    row_data,
    timeline_severity,
    coalesce(public.trust_timeline_safe_timestamptz(row_data ->> 'created_at'), now())
  );
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_event"("row_data" "jsonb", "timeline_event_type" "text", "timeline_title" "text", "timeline_summary" "text", "timeline_actor_type" "text", "timeline_severity" "text") OWNER TO "postgres";

--
-- Name: trust_timeline_record_evidence(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_evidence"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'evidence_uploaded',
    'Evidence uploaded',
    'Evidence was added to the verification workflow for human review.',
    coalesce(nullif(row_data ->> 'uploaded_by', ''), 'user'),
    'info'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_evidence"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_relationship(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'relationship_created',
    'Trust relationship created',
    'A source-to-target trust relationship was recorded for explainable provenance.',
    'relationship_registry',
    coalesce(nullif(row_data ->> 'confidence_level', ''), 'info')
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_relationship"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_signal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_signal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'signal_generated',
    coalesce(nullif(row_data ->> 'event', ''), 'Signal generated'),
    'A trust signal was generated for operational review.',
    'system',
    case when lower(coalesce(row_data ->> 'event', '')) like '%risk%' then 'review' else 'info' end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_signal"() OWNER TO "postgres";

--
-- Name: trust_timeline_record_trust_event(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_record_trust_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    coalesce(nullif(row_data ->> 'event_type', ''), 'operational_event'),
    coalesce(nullif(row_data ->> 'event_type', ''), 'Operational event'),
    'A trust event was recorded for operational provenance.',
    coalesce(nullif(row_data ->> 'actor_type', ''), 'system'),
    case when lower(coalesce(row_data ->> 'risk_level', '')) in ('high', 'critical') then 'review' else 'info' end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_record_trust_event"() OWNER TO "postgres";

--
-- Name: trust_timeline_safe_timestamptz("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_safe_timestamptz"("value" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  if value is null or value = '' then
    return null;
  end if;

  return value::timestamptz;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_safe_timestamptz"("value" "text") OWNER TO "postgres";

--
-- Name: trust_timeline_safe_uuid("text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_safe_uuid"("value" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  if value is null or value = '' then
    return null;
  end if;

  return value::uuid;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."trust_timeline_safe_uuid"("value" "text") OWNER TO "postgres";

--
-- Name: trust_timeline_subject_id("jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_subject_id"("row_data" "jsonb") RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select public.trust_timeline_safe_uuid(coalesce(
    nullif(row_data ->> 'subject_id', ''),
    nullif(row_data ->> 'passport_id', ''),
    nullif(row_data -> 'metadata' ->> 'passport_id', ''),
    nullif(row_data ->> 'agent_id', ''),
    nullif(row_data -> 'metadata' ->> 'agent_id', ''),
    nullif(row_data ->> 'verification_case_id', ''),
    nullif(row_data -> 'metadata' ->> 'verification_case_id', ''),
    nullif(row_data ->> 'source_id', '')
  ));
$$;


ALTER FUNCTION "public"."trust_timeline_subject_id"("row_data" "jsonb") OWNER TO "postgres";

--
-- Name: trust_timeline_subject_type("jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trust_timeline_subject_type"("row_data" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when row_data ? 'agent_id' and nullif(row_data ->> 'agent_id', '') is not null then 'agent'
    when row_data -> 'metadata' ? 'agent_id' and nullif(row_data -> 'metadata' ->> 'agent_id', '') is not null then 'agent'
    when nullif(row_data ->> 'subject_type', '') is not null then row_data ->> 'subject_type'
    when nullif(row_data ->> 'passport_id', '') is not null then 'passport'
    when row_data -> 'metadata' ? 'passport_id' and nullif(row_data -> 'metadata' ->> 'passport_id', '') is not null then 'passport'
    when nullif(row_data ->> 'verification_case_id', '') is not null then 'verification_case'
    when row_data -> 'metadata' ? 'verification_case_id' and nullif(row_data -> 'metadata' ->> 'verification_case_id', '') is not null then 'verification_case'
    when nullif(row_data ->> 'source_type', '') is not null then row_data ->> 'source_type'
    else 'workflow'
  end;
$$;


ALTER FUNCTION "public"."trust_timeline_subject_type"("row_data" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: admin_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."admin_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "enterprise_id" "uuid",
    "verification_event_id" "uuid",
    "status" "text" DEFAULT 'needs_manual_review'::"text",
    "reviewer_user_id" "uuid",
    "reviewer_email" "text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_reviews" OWNER TO "postgres";

--
-- Name: agent_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agent_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "activity_type" "text",
    "activity_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_activity" OWNER TO "postgres";

--
-- Name: agent_activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agent_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "action" "text" NOT NULL,
    "risk_level" "text" DEFAULT 'low'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_activity_logs" OWNER TO "postgres";

--
-- Name: agent_passports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agent_passports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "passport_status" "text" DEFAULT 'issued'::"text",
    "signature" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text"),
    "issued_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_passports" OWNER TO "postgres";

--
-- Name: agent_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agent_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "permission_name" "text",
    "permission_scope" "text",
    "risk_level" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_permissions" OWNER TO "postgres";

--
-- Name: agent_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agent_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid",
    "agent_name" "text" NOT NULL,
    "agent_type" "text" DEFAULT 'ai_agent'::"text",
    "purpose" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "trust_score" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_profiles" OWNER TO "postgres";

--
-- Name: agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_email" "text",
    "owner_user_id" "uuid",
    "purpose" "text",
    "model_provider" "text",
    "model_name" "text",
    "permission_scope" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "trust_score" numeric DEFAULT 50,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "agent_name" "text",
    "agent_type" "text",
    "owner_name" "text",
    "declared_purpose" "text",
    "model_family" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "risk_level" "text" DEFAULT 'medium'::"text",
    "origin_trace_score" numeric DEFAULT 50,
    "policy_status" "text" DEFAULT 'pending_policy_review'::"text",
    "last_verified_at" timestamp with time zone
);


ALTER TABLE "public"."agents" OWNER TO "postgres";

--
-- Name: ai_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."ai_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "agent_type" "text",
    "provider" "text",
    "owner_user_id" "uuid",
    "owner_enterprise_id" "uuid",
    "verification_status" "text" DEFAULT 'unverified'::"text",
    "risk_level" "text" DEFAULT 'unknown'::"text",
    "signing_key_id" "text",
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enterprise_id" "uuid",
    "owner_email" "text"
);


ALTER TABLE "public"."ai_agents" OWNER TO "postgres";

--
-- Name: ai_governance_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."ai_governance_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "summary" "text",
    "recommendations" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by_model" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_governance_runs" OWNER TO "postgres";

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid",
    "label" "text",
    "key_hash" "text",
    "status" "text" DEFAULT 'active'::"text",
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "user_email" "text",
    "key_prefix" "text",
    "usage_count" integer DEFAULT 0,
    "rate_limit_status" "text" DEFAULT 'normal'::"text"
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";

--
-- Name: api_test_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."api_test_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_name" "text",
    "status" "text",
    "safe_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_test_runs" OWNER TO "postgres";

--
-- Name: appeals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."appeals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "passport_id" "uuid",
    "verification_case_id" "uuid",
    "submitted_by_user_id" "uuid",
    "submitted_by_email" "text",
    "appeal_reason" "text",
    "status" "text" DEFAULT 'submitted'::"text",
    "reviewed_by" "text",
    "reviewed_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appeals" OWNER TO "postgres";

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."audit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_events" OWNER TO "postgres";

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "actor" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source_ip_hash" "text",
    "user_agent_hash" "text",
    "abuse_risk" "text" DEFAULT 'unknown'::"text",
    "allowed_file_type" "text",
    "suspicious_activity" boolean DEFAULT false,
    "rate_limit_status" "text" DEFAULT 'unknown'::"text",
    "scan_status" "text" DEFAULT 'pending'::"text",
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

--
-- Name: autonomy_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."autonomy_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_name" "text" NOT NULL,
    "subject_type" "text" DEFAULT 'ai_agent'::"text",
    "autonomy_level" "text" NOT NULL,
    "approval_required" boolean DEFAULT true,
    "risk_level" "text" DEFAULT 'medium'::"text",
    "governance_status" "text" DEFAULT 'active'::"text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "autonomy_profiles_autonomy_level_check" CHECK (("autonomy_level" = ANY (ARRAY['observe'::"text", 'advise'::"text", 'act_with_approval'::"text", 'act_autonomously'::"text"]))),
    CONSTRAINT "autonomy_profiles_governance_status_check" CHECK (("governance_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'blocked'::"text", 'retired'::"text"]))),
    CONSTRAINT "autonomy_profiles_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."autonomy_profiles" OWNER TO "postgres";

--
-- Name: billing_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."billing_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";

--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."candidate_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text",
    "email" "text",
    "role_applied_for" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "trust_score" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "risk_level" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "provenance_status" "text" DEFAULT 'unknown'::"text"
);


ALTER TABLE "public"."candidate_profiles" OWNER TO "postgres";

--
-- Name: cookie_consent_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."cookie_consent_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "enterprise_id" "uuid",
    "anonymous_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "consent_version" "text" NOT NULL,
    "necessary" boolean DEFAULT true NOT NULL,
    "analytics" boolean DEFAULT false NOT NULL,
    "marketing" boolean DEFAULT false NOT NULL,
    "preferences" boolean DEFAULT false NOT NULL,
    "source" "text" DEFAULT 'cookie_banner'::"text" NOT NULL,
    "jurisdiction" "text",
    "country_code" "text",
    "ip_hash" "text",
    "user_agent_hash" "text",
    "idempotency_key" "uuid" NOT NULL,
    "status" "text" DEFAULT 'persisted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supersedes_receipt_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "cookie_consent_receipts_consent_version_check" CHECK ((("length"("consent_version") >= 1) AND ("length"("consent_version") <= 100))),
    CONSTRAINT "cookie_consent_receipts_country_code_check" CHECK ((("country_code" IS NULL) OR ("country_code" ~ '^[A-Z]{2}$'::"text"))),
    CONSTRAINT "cookie_consent_receipts_ip_hash_check" CHECK ((("ip_hash" IS NULL) OR (("length"("ip_hash") >= 32) AND ("length"("ip_hash") <= 128)))),
    CONSTRAINT "cookie_consent_receipts_jurisdiction_check" CHECK ((("jurisdiction" IS NULL) OR ("length"("jurisdiction") <= 32))),
    CONSTRAINT "cookie_consent_receipts_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "cookie_consent_receipts_necessary_check" CHECK (("necessary" = true)),
    CONSTRAINT "cookie_consent_receipts_source_check" CHECK (("source" = ANY (ARRAY['cookie_banner'::"text", 'cookie_preferences'::"text", 'api'::"text"]))),
    CONSTRAINT "cookie_consent_receipts_status_check" CHECK (("status" = ANY (ARRAY['persisted'::"text", 'withdrawn'::"text", 'superseded'::"text"]))),
    CONSTRAINT "cookie_consent_receipts_user_agent_hash_check" CHECK ((("user_agent_hash" IS NULL) OR (("length"("user_agent_hash") >= 32) AND ("length"("user_agent_hash") <= 128))))
);

ALTER TABLE ONLY "public"."cookie_consent_receipts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cookie_consent_receipts" OWNER TO "postgres";

--
-- Name: TABLE "cookie_consent_receipts"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."cookie_consent_receipts" IS 'Append-only normalized cookie consent receipts. Raw IP addresses and raw user-agent strings must never be stored.';


--
-- Name: data_rights_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."data_rights_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_type" "text",
    "requester_email" "text",
    "requester_user_id" "uuid",
    "details" "text",
    "status" "text" DEFAULT 'open'::"text",
    "handled_by" "text",
    "handled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_rights_requests" OWNER TO "postgres";

--
-- Name: decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid",
    "decision" "text",
    "notes" "text",
    "decided_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "actor" "text",
    "status" "text",
    "verification_case_id" "uuid",
    "passport_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text",
    CONSTRAINT "decisions_decision_check" CHECK (("decision" = ANY (ARRAY['allow'::"text", 'deny'::"text", 'manual_review'::"text", 'needs_more_evidence'::"text"])))
);


ALTER TABLE "public"."decisions" OWNER TO "postgres";

--
-- Name: device_channel_evidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."device_channel_evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_integrity_check_id" "uuid",
    "evidence_type" "text",
    "evidence_status" "text" DEFAULT 'unknown'::"text",
    "evidence" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_channel_evidence" OWNER TO "postgres";

--
-- Name: enterprise_access_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."enterprise_access_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "work_email" "text" NOT NULL,
    "company" "text",
    "role" "text",
    "use_case" "text",
    "message" "text",
    "status" "text" DEFAULT 'new'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_size" "text",
    "current_problem" "text",
    "ai_usage_level" "text",
    "current_problem_category" "text",
    "design_partner_interest" boolean DEFAULT false,
    "governance_interest" boolean DEFAULT false,
    "operational_ai_interest" boolean DEFAULT false,
    "request_type" "text" DEFAULT 'enterprise_access'::"text",
    "plan_interest" "text",
    "beta_interest" boolean DEFAULT true
);


ALTER TABLE "public"."enterprise_access_requests" OWNER TO "postgres";

--
-- Name: evidence_chains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."evidence_chains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "chain_summary" "text",
    "evidence" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evidence_chains" OWNER TO "postgres";

--
-- Name: evidence_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."evidence_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid",
    "file_name" "text",
    "file_type" "text",
    "media_type" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "scan_status" "text" DEFAULT 'pending'::"text",
    "allowed_file_type" boolean DEFAULT true,
    "verification_case_id" "uuid",
    "passport_id" "uuid",
    "evidence_type" "text",
    "notes" "text",
    "uploaded_by" "text",
    "status" "text" DEFAULT 'pending_review'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_url" "text",
    "file_size" bigint,
    "public_url" "text",
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text",
    CONSTRAINT "evidence_files_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'audio'::"text", 'document'::"text", 'profile'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."evidence_files" OWNER TO "postgres";

--
-- Name: execution_passports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."execution_passports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "passport_id" "uuid",
    "intent_id" "uuid",
    "execution_summary" "text",
    "execution_type" "text",
    "risk_level" "text" DEFAULT 'medium'::"text",
    "approval_required" boolean DEFAULT true,
    "evidence_required" boolean DEFAULT true,
    "status" "text" DEFAULT 'pending_review'::"text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."execution_passports" OWNER TO "postgres";

--
-- Name: feedback_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feedback_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text",
    "message" "text",
    "screenshot_url" "text",
    "contact_preference" "text",
    "submitted_by_user_id" "uuid",
    "submitted_by_email" "text",
    "status" "text" DEFAULT 'new'::"text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_reports" OWNER TO "postgres";

--
-- Name: governance_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."governance_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_id" "uuid",
    "subject_type" "text",
    "subject_id" "uuid",
    "action_status" "text" DEFAULT 'pending'::"text",
    "assigned_to" "uuid",
    "resolution_notes" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone,
    "escalation_chain" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."governance_actions" OWNER TO "postgres";

--
-- Name: governance_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."governance_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text",
    "description" "text",
    "trigger_type" "text",
    "severity" "text" DEFAULT 'medium'::"text",
    "action_type" "text",
    "requires_human_review" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."governance_policies" OWNER TO "postgres";

--
-- Name: help_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."help_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "created_by_email" "text",
    "created_by_name" "text",
    "reply_channel" "text" DEFAULT 'in_app'::"text",
    "admin_answered_by" "text",
    "answered_at" timestamp with time zone
);


ALTER TABLE "public"."help_questions" OWNER TO "postgres";

--
-- Name: hopae_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."hopae_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "cyber_passport_id" "uuid",
    "verification_id" "text" NOT NULL,
    "provider_id" "text",
    "verification_model" "text",
    "status" "text" DEFAULT 'initiated'::"text" NOT NULL,
    "flow_type" "text",
    "flow_details" "jsonb" DEFAULT '{}'::"jsonb",
    "match_data" "jsonb" DEFAULT '{}'::"jsonb",
    "normalized_user" "jsonb" DEFAULT '{}'::"jsonb",
    "provenance" "jsonb" DEFAULT '{}'::"jsonb",
    "match_result" "jsonb" DEFAULT '{}'::"jsonb",
    "hopae_loa" integer,
    "acr" "text",
    "amr" "jsonb" DEFAULT '[]'::"jsonb",
    "raw_status" "jsonb" DEFAULT '{}'::"jsonb",
    "raw_userinfo" "jsonb" DEFAULT '{}'::"jsonb",
    "expires_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hopae_verifications" OWNER TO "postgres";

--
-- Name: hopae_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."hopae_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verification_id" "text",
    "event_type" "text",
    "signature_valid" boolean DEFAULT false,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hopae_webhook_events" OWNER TO "postgres";

--
-- Name: injection_risk_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."injection_risk_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_integrity_check_id" "uuid",
    "risk_type" "text",
    "risk_level" "text" DEFAULT 'unknown'::"text",
    "evidence" "jsonb" DEFAULT '{}'::"jsonb",
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."injection_risk_events" OWNER TO "postgres";

--
-- Name: integration_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."integration_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text",
    "status" "text",
    "purpose" "text",
    "required_env" "jsonb" DEFAULT '[]'::"jsonb",
    "risk_level" "text",
    "notes" "text",
    "checked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_status" OWNER TO "postgres";

--
-- Name: intent_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."intent_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intent_summary" "text",
    "risk_level" "text",
    "status" "text" DEFAULT 'pending_review'::"text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."intent_requests" OWNER TO "postgres";

--
-- Name: interest_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."interest_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company" "text",
    "role" "text",
    "use_case" "text",
    "interest_level" "text",
    "source" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interest_signals" OWNER TO "postgres";

--
-- Name: interview_risk_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."interview_risk_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_session_id" "uuid",
    "signal_type" "text",
    "signal_source" "text",
    "confidence_score" integer,
    "risk_reason" "text",
    "escalation_required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interview_risk_events" OWNER TO "postgres";

--
-- Name: interview_risk_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."interview_risk_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "enterprise_id" "uuid",
    "session_id" "uuid",
    "signal_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "risk_level" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interview_risk_signals" OWNER TO "postgres";

--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."interview_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid",
    "recruiter_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text",
    "session_type" "text" DEFAULT 'remote'::"text",
    "trust_score" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "workspace_id" "uuid",
    "session_status" "text" DEFAULT 'scheduled'::"text",
    "integrity_status" "text" DEFAULT 'pending'::"text",
    "risk_level" "text" DEFAULT 'unknown'::"text"
);


ALTER TABLE "public"."interview_sessions" OWNER TO "postgres";

--
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."knowledge_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "summary" "text",
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_by" "text",
    "approved_by" "text",
    "approved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_articles" OWNER TO "postgres";

--
-- Name: launch_control_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."launch_control_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."launch_control_notes" OWNER TO "postgres";

--
-- Name: liveness_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."liveness_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_session_id" "uuid",
    "result" "text" DEFAULT 'pending'::"text",
    "score" integer DEFAULT 0,
    "provider" "text" DEFAULT 'placeholder'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."liveness_checks" OWNER TO "postgres";

--
-- Name: message_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."message_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "sender_type" "text",
    "sender_email" "text",
    "message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_events" OWNER TO "postgres";

--
-- Name: message_threads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text",
    "created_by_user_id" "uuid",
    "created_by_email" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "body" "text",
    "notification_type" "text",
    "is_read" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message" "text",
    "severity" "text" DEFAULT 'info'::"text",
    "read" boolean DEFAULT false
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";

--
-- Name: operational_intelligence_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."operational_intelligence_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "subject_type" "text",
    "subject_id" "uuid",
    "event_type" "text",
    "severity" "text" DEFAULT 'info'::"text",
    "summary" "text",
    "recommended_action" "text",
    "requires_review" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."operational_intelligence_events" OWNER TO "postgres";

--
-- Name: passport_state_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."passport_state_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "passport_id" "uuid",
    "identity_state" "text",
    "evidence_state" "text",
    "trust_state" "text",
    "risk_movement" "text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."passport_state_checks" OWNER TO "postgres";

--
-- Name: passports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."passports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_email" "text",
    "subject_name" "text" NOT NULL,
    "subject_type" "text",
    "trust_score" integer DEFAULT 50,
    "clearance" "text" DEFAULT 'pending'::"text",
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "human_presence_index" integer DEFAULT 50,
    "origin_trace_score" integer DEFAULT 50,
    "attribution_confidence" integer DEFAULT 50,
    "provenance_status" "text" DEFAULT 'unknown'::"text",
    "review_status" "text" DEFAULT 'pending'::"text",
    "linkedin_url" "text",
    "linkedin_verification_status" "text" DEFAULT 'unverified'::"text",
    "linkedin_profile_consistency" integer DEFAULT 50,
    "linkedin_claimed_company" "text",
    "linkedin_claimed_role" "text",
    "linkedin_review_required" boolean DEFAULT false,
    "media_type" "text" DEFAULT 'profile'::"text",
    "biometric_confidence" integer DEFAULT 50,
    "behavioural_consistency" integer DEFAULT 50,
    "synthetic_risk" integer DEFAULT 50,
    "liveness_score" integer DEFAULT 50,
    "voice_clone_risk" integer DEFAULT 50,
    "video_deepfake_risk" integer DEFAULT 50,
    "image_authenticity_score" integer DEFAULT 50,
    "likely_source_type" "text" DEFAULT 'unknown'::"text",
    "model_fingerprint_risk" integer DEFAULT 50,
    "metadata_integrity" "text" DEFAULT 'unknown'::"text",
    "watermark_status" "text" DEFAULT 'unknown'::"text",
    "c2pa_status" "text" DEFAULT 'unknown'::"text",
    "upload_chain_status" "text" DEFAULT 'unknown'::"text",
    "human_review_required" boolean DEFAULT false,
    "trust_timeline_score" integer DEFAULT 50,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "reality_passport_status" "text" DEFAULT 'pending'::"text",
    "source_ip_hash" "text",
    "user_agent_hash" "text",
    "abuse_risk" "text" DEFAULT 'unknown'::"text",
    "suspicious_activity" boolean DEFAULT false,
    "allowed_file_type" "text",
    "rate_limit_status" "text" DEFAULT 'unknown'::"text",
    "scan_status" "text" DEFAULT 'pending'::"text",
    "evidence_status" "text" DEFAULT 'pending'::"text",
    "chain_of_custody_status" "text" DEFAULT 'unknown'::"text",
    "tamper_status" "text" DEFAULT 'unknown'::"text",
    "risk_level" "text" DEFAULT 'medium'::"text",
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text",
    CONSTRAINT "passports_subject_type_check" CHECK (("subject_type" = ANY (ARRAY['human'::"text", 'agent'::"text", 'candidate'::"text", 'content'::"text"])))
);


ALTER TABLE "public"."passports" OWNER TO "postgres";

--
-- Name: provenance_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."provenance_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "asset_type" "text",
    "file_name" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."provenance_assets" OWNER TO "postgres";

--
-- Name: provenance_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."provenance_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_detail" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enterprise_id" "uuid"
);


ALTER TABLE "public"."provenance_events" OWNER TO "postgres";

--
-- Name: provenance_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."provenance_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid",
    "c2pa_present" boolean DEFAULT false,
    "synthid_detected" boolean DEFAULT false,
    "confidence_score" integer DEFAULT 0,
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."provenance_reports" OWNER TO "postgres";

--
-- Name: recruiter_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."recruiter_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_name" "text",
    "verified" boolean DEFAULT false,
    "trust_score" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization" "text"
);


ALTER TABLE "public"."recruiter_profiles" OWNER TO "postgres";

--
-- Name: risk_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."risk_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid",
    "human_presence_index" integer DEFAULT 50,
    "origin_trace_score" integer DEFAULT 50,
    "attribution_confidence" integer DEFAULT 50,
    "synthetic_risk" integer DEFAULT 50,
    "liveness_score" integer DEFAULT 50,
    "voice_clone_risk" integer DEFAULT 50,
    "video_deepfake_risk" integer DEFAULT 50,
    "image_authenticity_score" integer DEFAULT 50,
    "provenance_status" "text" DEFAULT 'unknown'::"text",
    "review_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "text",
    "verification_case_id" "uuid",
    "score" integer,
    "risk_level" "text" DEFAULT 'unclassified'::"text"
);


ALTER TABLE "public"."risk_scores" OWNER TO "postgres";

--
-- Name: runtime_validation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."runtime_validation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "overall_status" "text",
    "health_score" integer,
    "summary" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."runtime_validation_logs" OWNER TO "postgres";

--
-- Name: session_integrity_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."session_integrity_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "session_id" "uuid",
    "liveness_status" "text" DEFAULT 'unknown'::"text",
    "deepfake_risk_status" "text" DEFAULT 'unknown'::"text",
    "injection_risk_status" "text" DEFAULT 'unknown'::"text",
    "channel_integrity_status" "text" DEFAULT 'unknown'::"text",
    "session_anomaly_status" "text" DEFAULT 'unknown'::"text",
    "recommended_action" "text",
    "explanation" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_integrity_checks" OWNER TO "postgres";

--
-- Name: signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text"
);


ALTER TABLE "public"."signals" OWNER TO "postgres";

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "plan" "text" DEFAULT 'free'::"text",
    "status" "text" DEFAULT 'inactive'::"text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

--
-- Name: system_health_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."system_health_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_name" "text" NOT NULL,
    "check_status" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_health_checks" OWNER TO "postgres";

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "member_email" "text" NOT NULL,
    "role" "text" DEFAULT 'reviewer'::"text",
    "invitation_status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_name" "text" NOT NULL,
    "trust_score" integer DEFAULT 50,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";

--
-- Name: trust_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid",
    "alert_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "severity" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "detected_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enterprise_id" "uuid"
);


ALTER TABLE "public"."trust_alerts" OWNER TO "postgres";

--
-- Name: trust_algorithm_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_algorithm_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "score" numeric,
    "confidence_level" "text",
    "positive_signals" "jsonb" DEFAULT '[]'::"jsonb",
    "negative_signals" "jsonb" DEFAULT '[]'::"jsonb",
    "missing_requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "recommended_action" "text",
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_algorithm_runs" OWNER TO "postgres";

--
-- Name: trust_assistant_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_assistant_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text",
    "answer_source" "text",
    "status" "text" DEFAULT 'pending_review'::"text",
    "asked_by_user_id" "uuid",
    "asked_by_email" "text",
    "answered_by" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_assistant_questions" OWNER TO "postgres";

--
-- Name: trust_case_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_case_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid",
    "target_type" "text",
    "target_id" "uuid",
    "relationship_type" "text" DEFAULT 'linked_to'::"text",
    "explanation" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_case_relationships" OWNER TO "postgres";

--
-- Name: trust_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "title" "text",
    "description" "text",
    "status" "text" DEFAULT 'open'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_demo" boolean DEFAULT false,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone,
    "escalation_chain" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."trust_cases" OWNER TO "postgres";

--
-- Name: trust_certifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid",
    "certification_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "trust_score" integer DEFAULT 50,
    "risk_level" "text" DEFAULT 'medium'::"text",
    "verification_method" "text",
    "reviewed_by" "uuid",
    "notes" "text",
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "enterprise_id" "uuid"
);


ALTER TABLE "public"."trust_certifications" OWNER TO "postgres";

--
-- Name: trust_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_type" "text",
    "actor_id" "uuid",
    "actor_label" "text",
    "event_type" "text" NOT NULL,
    "event_source" "text",
    "risk_level" "text" DEFAULT 'low'::"text",
    "case_id" "uuid",
    "passport_id" "uuid",
    "agent_id" "uuid",
    "evidence_id" "uuid",
    "decision_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_events" OWNER TO "postgres";

--
-- Name: trust_explanations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_explanations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trust_score_id" "uuid",
    "explanation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_explanations" OWNER TO "postgres";

--
-- Name: trust_graph_edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_graph_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_node_id" "uuid",
    "to_node_id" "uuid",
    "relationship_type" "text",
    "source_table" "text",
    "source_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_graph_edges" OWNER TO "postgres";

--
-- Name: trust_graph_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_graph_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_type" "text" NOT NULL,
    "source_table" "text",
    "source_id" "uuid",
    "label" "text",
    "status" "text",
    "risk_level" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_graph_nodes" OWNER TO "postgres";

--
-- Name: trust_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_type" "text",
    "source_id" "uuid",
    "relationship_type" "text",
    "target_type" "text",
    "target_id" "uuid",
    "confidence_level" "text" DEFAULT 'medium'::"text",
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_relationships" OWNER TO "postgres";

--
-- Name: trust_replay_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_replay_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "replay_summary" "text",
    "generated_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_replay_sessions" OWNER TO "postgres";

--
-- Name: trust_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "passport_id" "uuid",
    "profile_consistency" integer DEFAULT 50,
    "synthetic_risk" integer DEFAULT 50,
    "confidence" integer DEFAULT 50,
    "report_type" "text" DEFAULT 'hiring_shield'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "trust_score" integer DEFAULT 50,
    "human_presence_index" integer DEFAULT 50,
    "origin_trace_score" integer DEFAULT 50,
    "media_type" "text" DEFAULT 'profile'::"text",
    "human_review_required" boolean DEFAULT false,
    "linkedin_url" "text",
    "linkedin_verification_status" "text" DEFAULT 'unverified'::"text",
    "linkedin_profile_consistency" integer DEFAULT 50,
    "linkedin_review_required" boolean DEFAULT false,
    "biometric_confidence" integer DEFAULT 50,
    "behavioural_consistency" integer DEFAULT 50,
    "liveness_score" integer DEFAULT 50,
    "voice_clone_risk" integer DEFAULT 50,
    "video_deepfake_risk" integer DEFAULT 50,
    "image_authenticity_score" integer DEFAULT 50,
    "attribution_confidence" integer DEFAULT 50,
    "likely_source_type" "text" DEFAULT 'unknown'::"text",
    "model_fingerprint_risk" integer DEFAULT 50,
    "metadata_integrity" "text" DEFAULT 'unknown'::"text",
    "watermark_status" "text" DEFAULT 'unknown'::"text",
    "c2pa_status" "text" DEFAULT 'unknown'::"text",
    "upload_chain_status" "text" DEFAULT 'unknown'::"text",
    "provenance_status" "text" DEFAULT 'unknown'::"text",
    "trust_timeline_score" integer DEFAULT 50,
    "review_status" "text" DEFAULT 'pending'::"text",
    "linkedin_claimed_company" "text",
    "linkedin_claimed_role" "text",
    "source_ip_hash" "text",
    "user_agent_hash" "text",
    "abuse_risk" "text" DEFAULT 'unknown'::"text",
    "suspicious_activity" boolean DEFAULT false,
    "allowed_file_type" "text",
    "rate_limit_status" "text" DEFAULT 'unknown'::"text",
    "scan_status" "text" DEFAULT 'pending'::"text",
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text"
);


ALTER TABLE "public"."trust_reports" OWNER TO "postgres";

--
-- Name: trust_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "confidence" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."trust_scores" OWNER TO "postgres";

--
-- Name: trust_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trust_score_id" "uuid",
    "signal_type" "text" NOT NULL,
    "signal_value" "text",
    "weight" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_signals" OWNER TO "postgres";

--
-- Name: trust_timeline_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_timeline_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "event_type" "text",
    "event_title" "text",
    "event_summary" "text",
    "actor_type" "text",
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "severity" "text" DEFAULT 'info'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_timeline_events" OWNER TO "postgres";

--
-- Name: trust_workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."trust_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "slug" "text",
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_demo" boolean DEFAULT false,
    "pilot_mode" boolean DEFAULT false,
    "design_partner" boolean DEFAULT false
);


ALTER TABLE "public"."trust_workspaces" OWNER TO "postgres";

--
-- Name: usage_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."usage_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan" "text" NOT NULL,
    "max_passports" integer,
    "max_evidence_uploads" integer,
    "trust_graph_enabled" boolean DEFAULT false,
    "trust_intelligence_enabled" boolean DEFAULT false,
    "api_access_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "max_verification_workflows" integer,
    "user_id" "uuid"
);


ALTER TABLE "public"."usage_limits" OWNER TO "postgres";

--
-- Name: verification_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_type" "text" DEFAULT 'trust_review'::"text" NOT NULL,
    "subject_name" "text",
    "subject_type" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "decision" "text" DEFAULT 'manual_review'::"text",
    "risk_level" "text" DEFAULT 'medium'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "suspicious_activity" boolean DEFAULT false,
    "abuse_risk" "text" DEFAULT 'unknown'::"text",
    "rate_limit_status" "text" DEFAULT 'unknown'::"text",
    "passport_id" "uuid",
    "verification_status" "text" DEFAULT 'pending'::"text",
    "decision_type" "text" DEFAULT 'manual_review'::"text",
    "human_presence_index" integer DEFAULT 50,
    "origin_trace_score" integer DEFAULT 50,
    "trust_score" integer DEFAULT 50,
    "linkedin_url" "text",
    "linkedin_verification_status" "text" DEFAULT 'unverified'::"text",
    "linkedin_profile_consistency" integer DEFAULT 50,
    "linkedin_claimed_company" "text",
    "linkedin_claimed_role" "text",
    "linkedin_review_required" boolean DEFAULT false,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "owner_email" "text",
    "team_id" "text",
    "client_id" "text"
);


ALTER TABLE "public"."verification_cases" OWNER TO "postgres";

--
-- Name: verification_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "enterprise_id" "uuid",
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid",
    "session_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "risk_level" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_events" OWNER TO "postgres";

--
-- Name: verification_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text",
    "reason" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_flags" OWNER TO "postgres";

--
-- Name: verification_passports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_passports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_name" "text" NOT NULL,
    "trust_score" integer,
    "status" "text" DEFAULT 'pending'::"text",
    "world_verified" boolean DEFAULT false,
    "risk_flags" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "verification_passports_subject_type_check" CHECK (("subject_type" = ANY (ARRAY['human'::"text", 'agent'::"text", 'content'::"text"]))),
    CONSTRAINT "verification_passports_trust_score_check" CHECK ((("trust_score" >= 0) AND ("trust_score" <= 100)))
);


ALTER TABLE "public"."verification_passports" OWNER TO "postgres";

--
-- Name: verification_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "receipt_type" "text",
    "verification_status" "text",
    "confidence_level" "text",
    "issued_by" "uuid",
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "receipt_summary" "text",
    "evidence_snapshot" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."verification_receipts" OWNER TO "postgres";

--
-- Name: verification_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."verification_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text",
    "subject_id" "uuid",
    "signal_type" "text",
    "signal_source" "text",
    "confidence_score" integer,
    "risk_level" "text" DEFAULT 'unknown'::"text",
    "explanation" "text",
    "requires_manual_review" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_signals" OWNER TO "postgres";

--
-- Name: voice_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."voice_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_session_id" "uuid",
    "mismatch_detected" boolean DEFAULT false,
    "confidence" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voice_signals" OWNER TO "postgres";

--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."waitlist" (
    "email" "text" NOT NULL,
    "company" "text" NOT NULL,
    "role" "text" NOT NULL,
    "use_case" "text" NOT NULL
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";

--
-- Name: webcam_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."webcam_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_session_id" "uuid",
    "anomaly_detected" boolean DEFAULT false,
    "confidence" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webcam_signals" OWNER TO "postgres";

--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'reviewer'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";

--
-- Name: admin_reviews admin_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_reviews"
    ADD CONSTRAINT "admin_reviews_pkey" PRIMARY KEY ("id");


--
-- Name: agent_activity_logs agent_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_activity_logs"
    ADD CONSTRAINT "agent_activity_logs_pkey" PRIMARY KEY ("id");


--
-- Name: agent_activity agent_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_activity"
    ADD CONSTRAINT "agent_activity_pkey" PRIMARY KEY ("id");


--
-- Name: agent_passports agent_passports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_passports"
    ADD CONSTRAINT "agent_passports_pkey" PRIMARY KEY ("id");


--
-- Name: agent_permissions agent_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_permissions"
    ADD CONSTRAINT "agent_permissions_pkey" PRIMARY KEY ("id");


--
-- Name: agent_profiles agent_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");


--
-- Name: ai_agents ai_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_agents"
    ADD CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id");


--
-- Name: ai_governance_runs ai_governance_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_governance_runs"
    ADD CONSTRAINT "ai_governance_runs_pkey" PRIMARY KEY ("id");


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");


--
-- Name: api_test_runs api_test_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."api_test_runs"
    ADD CONSTRAINT "api_test_runs_pkey" PRIMARY KEY ("id");


--
-- Name: appeals appeals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."appeals"
    ADD CONSTRAINT "appeals_pkey" PRIMARY KEY ("id");


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: autonomy_profiles autonomy_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."autonomy_profiles"
    ADD CONSTRAINT "autonomy_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: billing_customers billing_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id");


--
-- Name: billing_customers billing_customers_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."candidate_profiles"
    ADD CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: cookie_consent_receipts cookie_consent_receipts_idempotency_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cookie_consent_receipts"
    ADD CONSTRAINT "cookie_consent_receipts_idempotency_unique" UNIQUE ("idempotency_key");


--
-- Name: cookie_consent_receipts cookie_consent_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cookie_consent_receipts"
    ADD CONSTRAINT "cookie_consent_receipts_pkey" PRIMARY KEY ("id");


--
-- Name: data_rights_requests data_rights_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."data_rights_requests"
    ADD CONSTRAINT "data_rights_requests_pkey" PRIMARY KEY ("id");


--
-- Name: decisions decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."decisions"
    ADD CONSTRAINT "decisions_pkey" PRIMARY KEY ("id");


--
-- Name: device_channel_evidence device_channel_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."device_channel_evidence"
    ADD CONSTRAINT "device_channel_evidence_pkey" PRIMARY KEY ("id");


--
-- Name: enterprise_access_requests enterprise_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."enterprise_access_requests"
    ADD CONSTRAINT "enterprise_access_requests_pkey" PRIMARY KEY ("id");


--
-- Name: evidence_chains evidence_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."evidence_chains"
    ADD CONSTRAINT "evidence_chains_pkey" PRIMARY KEY ("id");


--
-- Name: evidence_files evidence_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."evidence_files"
    ADD CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id");


--
-- Name: execution_passports execution_passports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."execution_passports"
    ADD CONSTRAINT "execution_passports_pkey" PRIMARY KEY ("id");


--
-- Name: feedback_reports feedback_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feedback_reports"
    ADD CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id");


--
-- Name: governance_actions governance_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."governance_actions"
    ADD CONSTRAINT "governance_actions_pkey" PRIMARY KEY ("id");


--
-- Name: governance_policies governance_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."governance_policies"
    ADD CONSTRAINT "governance_policies_pkey" PRIMARY KEY ("id");


--
-- Name: help_questions help_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."help_questions"
    ADD CONSTRAINT "help_questions_pkey" PRIMARY KEY ("id");


--
-- Name: hopae_verifications hopae_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hopae_verifications"
    ADD CONSTRAINT "hopae_verifications_pkey" PRIMARY KEY ("id");


--
-- Name: hopae_verifications hopae_verifications_verification_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hopae_verifications"
    ADD CONSTRAINT "hopae_verifications_verification_id_key" UNIQUE ("verification_id");


--
-- Name: hopae_webhook_events hopae_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hopae_webhook_events"
    ADD CONSTRAINT "hopae_webhook_events_pkey" PRIMARY KEY ("id");


--
-- Name: injection_risk_events injection_risk_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."injection_risk_events"
    ADD CONSTRAINT "injection_risk_events_pkey" PRIMARY KEY ("id");


--
-- Name: integration_status integration_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."integration_status"
    ADD CONSTRAINT "integration_status_pkey" PRIMARY KEY ("id");


--
-- Name: intent_requests intent_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."intent_requests"
    ADD CONSTRAINT "intent_requests_pkey" PRIMARY KEY ("id");


--
-- Name: interest_signals interest_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interest_signals"
    ADD CONSTRAINT "interest_signals_pkey" PRIMARY KEY ("id");


--
-- Name: interview_risk_events interview_risk_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_risk_events"
    ADD CONSTRAINT "interview_risk_events_pkey" PRIMARY KEY ("id");


--
-- Name: interview_risk_signals interview_risk_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_risk_signals"
    ADD CONSTRAINT "interview_risk_signals_pkey" PRIMARY KEY ("id");


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."knowledge_articles"
    ADD CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id");


--
-- Name: launch_control_notes launch_control_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."launch_control_notes"
    ADD CONSTRAINT "launch_control_notes_pkey" PRIMARY KEY ("id");


--
-- Name: liveness_checks liveness_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."liveness_checks"
    ADD CONSTRAINT "liveness_checks_pkey" PRIMARY KEY ("id");


--
-- Name: message_events message_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."message_events"
    ADD CONSTRAINT "message_events_pkey" PRIMARY KEY ("id");


--
-- Name: message_threads message_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: operational_intelligence_events operational_intelligence_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."operational_intelligence_events"
    ADD CONSTRAINT "operational_intelligence_events_pkey" PRIMARY KEY ("id");


--
-- Name: passport_state_checks passport_state_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."passport_state_checks"
    ADD CONSTRAINT "passport_state_checks_pkey" PRIMARY KEY ("id");


--
-- Name: passports passports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."passports"
    ADD CONSTRAINT "passports_pkey" PRIMARY KEY ("id");


--
-- Name: provenance_assets provenance_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_assets"
    ADD CONSTRAINT "provenance_assets_pkey" PRIMARY KEY ("id");


--
-- Name: provenance_events provenance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_events"
    ADD CONSTRAINT "provenance_events_pkey" PRIMARY KEY ("id");


--
-- Name: provenance_reports provenance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_reports"
    ADD CONSTRAINT "provenance_reports_pkey" PRIMARY KEY ("id");


--
-- Name: recruiter_profiles recruiter_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recruiter_profiles"
    ADD CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: risk_scores risk_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id");


--
-- Name: runtime_validation_logs runtime_validation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."runtime_validation_logs"
    ADD CONSTRAINT "runtime_validation_logs_pkey" PRIMARY KEY ("id");


--
-- Name: session_integrity_checks session_integrity_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session_integrity_checks"
    ADD CONSTRAINT "session_integrity_checks_pkey" PRIMARY KEY ("id");


--
-- Name: signals signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."signals"
    ADD CONSTRAINT "signals_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");


--
-- Name: system_health_checks system_health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system_health_checks"
    ADD CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");


--
-- Name: trust_alerts trust_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_alerts"
    ADD CONSTRAINT "trust_alerts_pkey" PRIMARY KEY ("id");


--
-- Name: trust_algorithm_runs trust_algorithm_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_algorithm_runs"
    ADD CONSTRAINT "trust_algorithm_runs_pkey" PRIMARY KEY ("id");


--
-- Name: trust_assistant_questions trust_assistant_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_assistant_questions"
    ADD CONSTRAINT "trust_assistant_questions_pkey" PRIMARY KEY ("id");


--
-- Name: trust_case_relationships trust_case_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_case_relationships"
    ADD CONSTRAINT "trust_case_relationships_pkey" PRIMARY KEY ("id");


--
-- Name: trust_cases trust_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_cases"
    ADD CONSTRAINT "trust_cases_pkey" PRIMARY KEY ("id");


--
-- Name: trust_certifications trust_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_certifications"
    ADD CONSTRAINT "trust_certifications_pkey" PRIMARY KEY ("id");


--
-- Name: trust_events trust_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_events"
    ADD CONSTRAINT "trust_events_pkey" PRIMARY KEY ("id");


--
-- Name: trust_explanations trust_explanations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_explanations"
    ADD CONSTRAINT "trust_explanations_pkey" PRIMARY KEY ("id");


--
-- Name: trust_graph_edges trust_graph_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_graph_edges"
    ADD CONSTRAINT "trust_graph_edges_pkey" PRIMARY KEY ("id");


--
-- Name: trust_graph_nodes trust_graph_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_graph_nodes"
    ADD CONSTRAINT "trust_graph_nodes_pkey" PRIMARY KEY ("id");


--
-- Name: trust_relationships trust_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_relationships"
    ADD CONSTRAINT "trust_relationships_pkey" PRIMARY KEY ("id");


--
-- Name: trust_replay_sessions trust_replay_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_replay_sessions"
    ADD CONSTRAINT "trust_replay_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: trust_reports trust_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_reports"
    ADD CONSTRAINT "trust_reports_pkey" PRIMARY KEY ("id");


--
-- Name: trust_scores trust_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_scores"
    ADD CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("id");


--
-- Name: trust_signals trust_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_signals"
    ADD CONSTRAINT "trust_signals_pkey" PRIMARY KEY ("id");


--
-- Name: trust_timeline_events trust_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_timeline_events"
    ADD CONSTRAINT "trust_timeline_events_pkey" PRIMARY KEY ("id");


--
-- Name: trust_workspaces trust_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_workspaces"
    ADD CONSTRAINT "trust_workspaces_pkey" PRIMARY KEY ("id");


--
-- Name: trust_workspaces trust_workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_workspaces"
    ADD CONSTRAINT "trust_workspaces_slug_key" UNIQUE ("slug");


--
-- Name: usage_limits usage_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("id");


--
-- Name: usage_limits usage_limits_plan_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_plan_key" UNIQUE ("plan");


--
-- Name: verification_cases verification_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_cases"
    ADD CONSTRAINT "verification_cases_pkey" PRIMARY KEY ("id");


--
-- Name: verification_events verification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_events"
    ADD CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id");


--
-- Name: verification_flags verification_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_flags"
    ADD CONSTRAINT "verification_flags_pkey" PRIMARY KEY ("id");


--
-- Name: verification_passports verification_passports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_passports"
    ADD CONSTRAINT "verification_passports_pkey" PRIMARY KEY ("id");


--
-- Name: verification_receipts verification_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_receipts"
    ADD CONSTRAINT "verification_receipts_pkey" PRIMARY KEY ("id");


--
-- Name: verification_signals verification_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_signals"
    ADD CONSTRAINT "verification_signals_pkey" PRIMARY KEY ("id");


--
-- Name: voice_signals voice_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."voice_signals"
    ADD CONSTRAINT "voice_signals_pkey" PRIMARY KEY ("id");


--
-- Name: waitlist waitlist_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_key" UNIQUE ("email");


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("email", "company", "role", "use_case");


--
-- Name: webcam_signals webcam_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."webcam_signals"
    ADD CONSTRAINT "webcam_signals_pkey" PRIMARY KEY ("id");


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");


--
-- Name: agent_activity_agent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "agent_activity_agent_id_idx" ON "public"."agent_activity" USING "btree" ("agent_id");


--
-- Name: ai_agents_owner_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ai_agents_owner_user_id_idx" ON "public"."ai_agents" USING "btree" ("owner_user_id");


--
-- Name: api_test_runs_name_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "api_test_runs_name_created_idx" ON "public"."api_test_runs" USING "btree" ("test_name", "created_at" DESC);


--
-- Name: billing_customers_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "billing_customers_user_id_idx" ON "public"."billing_customers" USING "btree" ("user_id");


--
-- Name: cookie_consent_receipts_anonymous_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "cookie_consent_receipts_anonymous_created_idx" ON "public"."cookie_consent_receipts" USING "btree" ("anonymous_id", "created_at" DESC);


--
-- Name: cookie_consent_receipts_enterprise_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "cookie_consent_receipts_enterprise_created_idx" ON "public"."cookie_consent_receipts" USING "btree" ("enterprise_id", "created_at" DESC) WHERE ("enterprise_id" IS NOT NULL);


--
-- Name: cookie_consent_receipts_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "cookie_consent_receipts_user_created_idx" ON "public"."cookie_consent_receipts" USING "btree" ("user_id", "created_at" DESC) WHERE ("user_id" IS NOT NULL);


--
-- Name: evidence_chains_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "evidence_chains_subject_idx" ON "public"."evidence_chains" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: governance_actions_assigned_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "governance_actions_assigned_idx" ON "public"."governance_actions" USING "btree" ("assigned_to", "action_status", "created_at" DESC);


--
-- Name: governance_actions_policy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "governance_actions_policy_idx" ON "public"."governance_actions" USING "btree" ("policy_id", "action_status", "created_at" DESC);


--
-- Name: governance_actions_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "governance_actions_subject_idx" ON "public"."governance_actions" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: governance_policies_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "governance_policies_workspace_idx" ON "public"."governance_policies" USING "btree" ("workspace_id", "trigger_type", "created_at" DESC);


--
-- Name: idx_ai_enterprise; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_ai_enterprise" ON "public"."ai_agents" USING "btree" ("enterprise_id");


--
-- Name: idx_enterprise_access_ai_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_enterprise_access_ai_usage" ON "public"."enterprise_access_requests" USING "btree" ("ai_usage_level");


--
-- Name: idx_enterprise_access_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_enterprise_access_created_at" ON "public"."enterprise_access_requests" USING "btree" ("created_at" DESC);


--
-- Name: idx_enterprise_access_problem_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_enterprise_access_problem_category" ON "public"."enterprise_access_requests" USING "btree" ("current_problem_category");


--
-- Name: idx_enterprise_access_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_enterprise_access_status" ON "public"."enterprise_access_requests" USING "btree" ("status");


--
-- Name: idx_governance_actions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_governance_actions_status" ON "public"."governance_actions" USING "btree" ("action_status");


--
-- Name: idx_hopae_verifications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_hopae_verifications_status" ON "public"."hopae_verifications" USING "btree" ("status");


--
-- Name: idx_hopae_verifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_hopae_verifications_user_id" ON "public"."hopae_verifications" USING "btree" ("user_id");


--
-- Name: idx_hopae_verifications_verification_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_hopae_verifications_verification_id" ON "public"."hopae_verifications" USING "btree" ("verification_id");


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "is_read");


--
-- Name: idx_operational_intelligence_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_operational_intelligence_workspace" ON "public"."operational_intelligence_events" USING "btree" ("workspace_id");


--
-- Name: idx_pe_enterprise; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_pe_enterprise" ON "public"."provenance_events" USING "btree" ("enterprise_id");


--
-- Name: idx_session_integrity_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_session_integrity_subject" ON "public"."session_integrity_checks" USING "btree" ("subject_type", "subject_id");


--
-- Name: idx_ta_enterprise; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_ta_enterprise" ON "public"."trust_alerts" USING "btree" ("enterprise_id");


--
-- Name: idx_tc_enterprise; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tc_enterprise" ON "public"."trust_certifications" USING "btree" ("enterprise_id");


--
-- Name: idx_tc_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_tc_subject" ON "public"."trust_certifications" USING "btree" ("subject_type", "subject_id");


--
-- Name: idx_trust_cases_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_cases_workspace" ON "public"."trust_cases" USING "btree" ("workspace_id");


--
-- Name: idx_trust_relationships_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_relationships_source" ON "public"."trust_relationships" USING "btree" ("source_type", "source_id");


--
-- Name: idx_trust_relationships_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_relationships_target" ON "public"."trust_relationships" USING "btree" ("target_type", "target_id");


--
-- Name: idx_trust_replay_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_replay_subject" ON "public"."trust_replay_sessions" USING "btree" ("subject_type", "subject_id");


--
-- Name: idx_trust_timeline_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_timeline_created" ON "public"."trust_timeline_events" USING "btree" ("created_at" DESC);


--
-- Name: idx_trust_timeline_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_trust_timeline_subject" ON "public"."trust_timeline_events" USING "btree" ("subject_type", "subject_id");


--
-- Name: idx_verification_receipts_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_verification_receipts_subject" ON "public"."verification_receipts" USING "btree" ("subject_type", "subject_id");


--
-- Name: idx_verification_signals_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_verification_signals_subject" ON "public"."verification_signals" USING "btree" ("subject_type", "subject_id");


--
-- Name: integration_status_provider_checked_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "integration_status_provider_checked_idx" ON "public"."integration_status" USING "btree" ("provider", "checked_at" DESC);


--
-- Name: interview_risk_events_session_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "interview_risk_events_session_idx" ON "public"."interview_risk_events" USING "btree" ("interview_session_id", "created_at" DESC);


--
-- Name: interview_risk_events_signal_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "interview_risk_events_signal_idx" ON "public"."interview_risk_events" USING "btree" ("signal_type", "escalation_required", "created_at" DESC);


--
-- Name: launch_control_notes_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "launch_control_notes_created_idx" ON "public"."launch_control_notes" USING "btree" ("created_at" DESC);


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_type_idx" ON "public"."notifications" USING "btree" ("notification_type", "created_at" DESC);


--
-- Name: notifications_user_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_user_read_idx" ON "public"."notifications" USING "btree" ("user_id", "read", "created_at" DESC);


--
-- Name: operational_intelligence_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "operational_intelligence_subject_idx" ON "public"."operational_intelligence_events" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: operational_intelligence_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "operational_intelligence_type_idx" ON "public"."operational_intelligence_events" USING "btree" ("event_type", "requires_review", "created_at" DESC);


--
-- Name: operational_intelligence_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "operational_intelligence_workspace_idx" ON "public"."operational_intelligence_events" USING "btree" ("workspace_id", "severity", "created_at" DESC);


--
-- Name: subscriptions_stripe_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");


--
-- Name: subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscriptions_user_id_idx" ON "public"."subscriptions" USING "btree" ("user_id");


--
-- Name: trust_algorithm_runs_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_algorithm_runs_subject_idx" ON "public"."trust_algorithm_runs" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: trust_case_relationships_case_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_case_relationships_case_idx" ON "public"."trust_case_relationships" USING "btree" ("case_id", "target_type", "created_at" DESC);


--
-- Name: trust_cases_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_cases_workspace_idx" ON "public"."trust_cases" USING "btree" ("workspace_id", "status", "priority", "created_at" DESC);


--
-- Name: trust_relationships_source_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_relationships_source_idx" ON "public"."trust_relationships" USING "btree" ("source_type", "source_id", "created_at" DESC);


--
-- Name: trust_relationships_target_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_relationships_target_idx" ON "public"."trust_relationships" USING "btree" ("target_type", "target_id", "created_at" DESC);


--
-- Name: trust_relationships_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_relationships_type_idx" ON "public"."trust_relationships" USING "btree" ("relationship_type", "created_at" DESC);


--
-- Name: trust_replay_sessions_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_replay_sessions_created_at_idx" ON "public"."trust_replay_sessions" USING "btree" ("created_at" DESC);


--
-- Name: trust_replay_sessions_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_replay_sessions_subject_idx" ON "public"."trust_replay_sessions" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: trust_timeline_events_severity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_timeline_events_severity_idx" ON "public"."trust_timeline_events" USING "btree" ("severity", "created_at" DESC);


--
-- Name: trust_timeline_events_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_timeline_events_subject_idx" ON "public"."trust_timeline_events" USING "btree" ("subject_type", "subject_id", "created_at" DESC);


--
-- Name: trust_timeline_events_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_timeline_events_type_idx" ON "public"."trust_timeline_events" USING "btree" ("event_type", "created_at" DESC);


--
-- Name: trust_workspaces_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "trust_workspaces_created_by_idx" ON "public"."trust_workspaces" USING "btree" ("created_by", "created_at" DESC);


--
-- Name: usage_limits_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "usage_limits_user_id_idx" ON "public"."usage_limits" USING "btree" ("user_id");


--
-- Name: verification_receipts_subject_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "verification_receipts_subject_idx" ON "public"."verification_receipts" USING "btree" ("subject_type", "subject_id", "issued_at" DESC);


--
-- Name: verification_receipts_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "verification_receipts_type_idx" ON "public"."verification_receipts" USING "btree" ("receipt_type", "issued_at" DESC);


--
-- Name: workspace_members_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "workspace_members_workspace_idx" ON "public"."workspace_members" USING "btree" ("workspace_id", "user_id");


--
-- Name: cookie_consent_receipts cookie_consent_receipts_prevent_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "cookie_consent_receipts_prevent_update" BEFORE DELETE OR UPDATE ON "public"."cookie_consent_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_cookie_consent_mutation"();


--
-- Name: evidence_chains evidence_chains_integrity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "evidence_chains_integrity_insert" AFTER INSERT ON "public"."evidence_chains" FOR EACH ROW EXECUTE FUNCTION "public"."evidence_chain_record_integrity"();


--
-- Name: governance_actions governance_action_created_records; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_action_created_records" AFTER INSERT ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."record_governance_action_created"();


--
-- Name: governance_actions governance_action_updated_records; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_action_updated_records" AFTER UPDATE ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."record_governance_action_updated"();


--
-- Name: agent_activity governance_agent_activity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_agent_activity_insert" AFTER INSERT ON "public"."agent_activity" FOR EACH ROW EXECUTE FUNCTION "public"."governance_from_agent_activity"();


--
-- Name: audit_logs governance_ai_audit_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_ai_audit_insert" AFTER INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."governance_from_ai_audit"();


--
-- Name: trust_cases governance_case_missing_evidence; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_case_missing_evidence" AFTER INSERT OR UPDATE ON "public"."trust_cases" FOR EACH ROW EXECUTE FUNCTION "public"."governance_from_case_missing_evidence"();


--
-- Name: signals governance_signal_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_signal_insert" AFTER INSERT ON "public"."signals" FOR EACH ROW EXECUTE FUNCTION "public"."governance_from_signal"();


--
-- Name: trust_algorithm_runs governance_trust_algorithm_run; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "governance_trust_algorithm_run" AFTER INSERT ON "public"."trust_algorithm_runs" FOR EACH ROW EXECUTE FUNCTION "public"."governance_from_trust_algorithm_run"();


--
-- Name: interview_risk_events hiring_risk_event_records; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "hiring_risk_event_records" AFTER INSERT ON "public"."interview_risk_events" FOR EACH ROW EXECUTE FUNCTION "public"."hiring_risk_event_records"();


--
-- Name: audit_logs notify_ai_recommendation_audit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "notify_ai_recommendation_audit" AFTER INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."notify_ai_recommendation_audit"();


--
-- Name: governance_actions notify_governance_action_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "notify_governance_action_insert" AFTER INSERT ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_governance_action_insert"();


--
-- Name: governance_actions notify_governance_action_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "notify_governance_action_update" AFTER UPDATE ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_governance_action_update"();


--
-- Name: agent_activity notify_suspicious_agent_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "notify_suspicious_agent_activity" AFTER INSERT ON "public"."agent_activity" FOR EACH ROW EXECUTE FUNCTION "public"."notify_suspicious_agent_activity"();


--
-- Name: trust_cases notify_trust_case_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "notify_trust_case_update" AFTER UPDATE ON "public"."trust_cases" FOR EACH ROW EXECUTE FUNCTION "public"."notify_trust_case_update"();


--
-- Name: agent_activity operational_intelligence_agent_activity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_agent_activity_insert" AFTER INSERT ON "public"."agent_activity" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_agent_activity"();


--
-- Name: operational_intelligence_events operational_intelligence_event_integrity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_event_integrity_insert" AFTER INSERT ON "public"."operational_intelligence_events" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_record_integrity"();


--
-- Name: governance_actions operational_intelligence_governance_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_governance_insert" AFTER INSERT ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_governance"();


--
-- Name: governance_actions operational_intelligence_governance_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_governance_update" AFTER UPDATE ON "public"."governance_actions" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_governance"();


--
-- Name: interview_risk_events operational_intelligence_interview_risk_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_interview_risk_insert" AFTER INSERT ON "public"."interview_risk_events" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_interview_risk"();


--
-- Name: trust_cases operational_intelligence_trust_case_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_trust_case_insert" AFTER INSERT ON "public"."trust_cases" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_trust_case"();


--
-- Name: trust_cases operational_intelligence_trust_case_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "operational_intelligence_trust_case_update" AFTER UPDATE ON "public"."trust_cases" FOR EACH ROW EXECUTE FUNCTION "public"."operational_intelligence_from_trust_case"();


--
-- Name: trust_cases trust_case_created_timeline; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_case_created_timeline" AFTER INSERT ON "public"."trust_cases" FOR EACH ROW EXECUTE FUNCTION "public"."record_trust_case_created"();


--
-- Name: trust_case_relationships trust_case_relationship_created_timeline; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_case_relationship_created_timeline" AFTER INSERT ON "public"."trust_case_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."record_trust_case_relationship_created"();


--
-- Name: agent_activity trust_timeline_agent_activity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_agent_activity_insert" AFTER INSERT ON "public"."agent_activity" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_agent_activity"();


--
-- Name: trust_algorithm_runs trust_timeline_algorithm_run_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_algorithm_run_insert" AFTER INSERT ON "public"."trust_algorithm_runs" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_algorithm_run"();


--
-- Name: audit_logs trust_timeline_audit_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_audit_insert" AFTER INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_audit"();


--
-- Name: decisions trust_timeline_decision_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_decision_insert" AFTER INSERT ON "public"."decisions" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_decision"();


--
-- Name: evidence_files trust_timeline_evidence_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_evidence_insert" AFTER INSERT ON "public"."evidence_files" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_evidence"();


--
-- Name: trust_relationships trust_timeline_relationship_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_relationship_insert" AFTER INSERT ON "public"."trust_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_relationship"();


--
-- Name: signals trust_timeline_signal_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_signal_insert" AFTER INSERT ON "public"."signals" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_signal"();


--
-- Name: trust_events trust_timeline_trust_event_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trust_timeline_trust_event_insert" AFTER INSERT ON "public"."trust_events" FOR EACH ROW EXECUTE FUNCTION "public"."trust_timeline_record_trust_event"();


--
-- Name: verification_receipts verification_receipts_integrity_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "verification_receipts_integrity_insert" AFTER INSERT ON "public"."verification_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."trust_receipt_record_integrity"();


--
-- Name: admin_reviews admin_reviews_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_reviews"
    ADD CONSTRAINT "admin_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: admin_reviews admin_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_reviews"
    ADD CONSTRAINT "admin_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: admin_reviews admin_reviews_verification_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_reviews"
    ADD CONSTRAINT "admin_reviews_verification_event_id_fkey" FOREIGN KEY ("verification_event_id") REFERENCES "public"."verification_events"("id") ON DELETE CASCADE;


--
-- Name: agent_activity agent_activity_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_activity"
    ADD CONSTRAINT "agent_activity_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;


--
-- Name: agent_activity_logs agent_activity_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_activity_logs"
    ADD CONSTRAINT "agent_activity_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE CASCADE;


--
-- Name: agent_passports agent_passports_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_passports"
    ADD CONSTRAINT "agent_passports_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE CASCADE;


--
-- Name: agent_profiles agent_profiles_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: audit_events audit_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: candidate_profiles candidate_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."candidate_profiles"
    ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: cookie_consent_receipts cookie_consent_receipts_supersedes_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cookie_consent_receipts"
    ADD CONSTRAINT "cookie_consent_receipts_supersedes_receipt_id_fkey" FOREIGN KEY ("supersedes_receipt_id") REFERENCES "public"."cookie_consent_receipts"("id");


--
-- Name: cookie_consent_receipts cookie_consent_receipts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."cookie_consent_receipts"
    ADD CONSTRAINT "cookie_consent_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: decisions decisions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."decisions"
    ADD CONSTRAINT "decisions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."verification_cases"("id") ON DELETE CASCADE;


--
-- Name: device_channel_evidence device_channel_evidence_session_integrity_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."device_channel_evidence"
    ADD CONSTRAINT "device_channel_evidence_session_integrity_check_id_fkey" FOREIGN KEY ("session_integrity_check_id") REFERENCES "public"."session_integrity_checks"("id") ON DELETE CASCADE;


--
-- Name: evidence_files evidence_files_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."evidence_files"
    ADD CONSTRAINT "evidence_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."verification_cases"("id") ON DELETE CASCADE;


--
-- Name: governance_actions governance_actions_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."governance_actions"
    ADD CONSTRAINT "governance_actions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."governance_policies"("id") ON DELETE CASCADE;


--
-- Name: governance_policies governance_policies_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."governance_policies"
    ADD CONSTRAINT "governance_policies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."trust_workspaces"("id") ON DELETE CASCADE;


--
-- Name: hopae_verifications hopae_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hopae_verifications"
    ADD CONSTRAINT "hopae_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: injection_risk_events injection_risk_events_session_integrity_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."injection_risk_events"
    ADD CONSTRAINT "injection_risk_events_session_integrity_check_id_fkey" FOREIGN KEY ("session_integrity_check_id") REFERENCES "public"."session_integrity_checks"("id") ON DELETE CASCADE;


--
-- Name: interview_risk_events interview_risk_events_interview_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_risk_events"
    ADD CONSTRAINT "interview_risk_events_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


--
-- Name: interview_risk_signals interview_risk_signals_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_risk_signals"
    ADD CONSTRAINT "interview_risk_signals_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


--
-- Name: interview_risk_signals interview_risk_signals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_risk_signals"
    ADD CONSTRAINT "interview_risk_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: interview_sessions interview_sessions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate_profiles"("id") ON DELETE CASCADE;


--
-- Name: interview_sessions interview_sessions_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "public"."recruiter_profiles"("id") ON DELETE SET NULL;


--
-- Name: interview_sessions interview_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: interview_sessions interview_sessions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."trust_workspaces"("id") ON DELETE CASCADE;


--
-- Name: liveness_checks liveness_checks_interview_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."liveness_checks"
    ADD CONSTRAINT "liveness_checks_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


--
-- Name: liveness_checks liveness_checks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."liveness_checks"
    ADD CONSTRAINT "liveness_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: operational_intelligence_events operational_intelligence_events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."operational_intelligence_events"
    ADD CONSTRAINT "operational_intelligence_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."trust_workspaces"("id") ON DELETE SET NULL;


--
-- Name: provenance_assets provenance_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_assets"
    ADD CONSTRAINT "provenance_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: provenance_events provenance_events_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_events"
    ADD CONSTRAINT "provenance_events_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."provenance_reports"("id") ON DELETE CASCADE;


--
-- Name: provenance_reports provenance_reports_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."provenance_reports"
    ADD CONSTRAINT "provenance_reports_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."provenance_assets"("id") ON DELETE CASCADE;


--
-- Name: recruiter_profiles recruiter_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recruiter_profiles"
    ADD CONSTRAINT "recruiter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."verification_cases"("id") ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_verification_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_verification_case_id_fkey" FOREIGN KEY ("verification_case_id") REFERENCES "public"."verification_cases"("id") ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: trust_case_relationships trust_case_relationships_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_case_relationships"
    ADD CONSTRAINT "trust_case_relationships_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE CASCADE;


--
-- Name: trust_cases trust_cases_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_cases"
    ADD CONSTRAINT "trust_cases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."trust_workspaces"("id") ON DELETE CASCADE;


--
-- Name: trust_explanations trust_explanations_trust_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_explanations"
    ADD CONSTRAINT "trust_explanations_trust_score_id_fkey" FOREIGN KEY ("trust_score_id") REFERENCES "public"."trust_scores"("id") ON DELETE CASCADE;


--
-- Name: trust_reports trust_reports_passport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_reports"
    ADD CONSTRAINT "trust_reports_passport_id_fkey" FOREIGN KEY ("passport_id") REFERENCES "public"."passports"("id");


--
-- Name: trust_scores trust_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_scores"
    ADD CONSTRAINT "trust_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: trust_signals trust_signals_trust_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."trust_signals"
    ADD CONSTRAINT "trust_signals_trust_score_id_fkey" FOREIGN KEY ("trust_score_id") REFERENCES "public"."trust_scores"("id") ON DELETE CASCADE;


--
-- Name: usage_limits usage_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."usage_limits"
    ADD CONSTRAINT "usage_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: verification_events verification_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_events"
    ADD CONSTRAINT "verification_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE SET NULL;


--
-- Name: verification_events verification_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."verification_events"
    ADD CONSTRAINT "verification_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: voice_signals voice_signals_interview_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."voice_signals"
    ADD CONSTRAINT "voice_signals_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


--
-- Name: webcam_signals webcam_signals_interview_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."webcam_signals"
    ADD CONSTRAINT "webcam_signals_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."trust_workspaces"("id") ON DELETE CASCADE;


--
-- Name: api_keys Allow authenticated api_keys inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated api_keys inserts" ON "public"."api_keys" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: api_keys Allow authenticated api_keys reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated api_keys reads" ON "public"."api_keys" FOR SELECT TO "authenticated" USING (true);


--
-- Name: api_keys Allow authenticated api_keys updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated api_keys updates" ON "public"."api_keys" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: audit_logs Allow authenticated audit_logs inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated audit_logs inserts" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: audit_logs Allow authenticated audit_logs reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated audit_logs reads" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);


--
-- Name: audit_logs Allow authenticated audit_logs updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated audit_logs updates" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: decisions Allow authenticated decisions inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated decisions inserts" ON "public"."decisions" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: decisions Allow authenticated decisions reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated decisions reads" ON "public"."decisions" FOR SELECT TO "authenticated" USING (true);


--
-- Name: decisions Allow authenticated decisions updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated decisions updates" ON "public"."decisions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: evidence_files Allow authenticated evidence_files inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated evidence_files inserts" ON "public"."evidence_files" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: evidence_files Allow authenticated evidence_files reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated evidence_files reads" ON "public"."evidence_files" FOR SELECT TO "authenticated" USING (true);


--
-- Name: evidence_files Allow authenticated evidence_files updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated evidence_files updates" ON "public"."evidence_files" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: passports Allow authenticated passports inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated passports inserts" ON "public"."passports" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: passports Allow authenticated passports reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated passports reads" ON "public"."passports" FOR SELECT TO "authenticated" USING (true);


--
-- Name: passports Allow authenticated passports updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated passports updates" ON "public"."passports" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: risk_scores Allow authenticated risk_scores inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated risk_scores inserts" ON "public"."risk_scores" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: risk_scores Allow authenticated risk_scores reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated risk_scores reads" ON "public"."risk_scores" FOR SELECT TO "authenticated" USING (true);


--
-- Name: risk_scores Allow authenticated risk_scores updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated risk_scores updates" ON "public"."risk_scores" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: signals Allow authenticated signals inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated signals inserts" ON "public"."signals" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: signals Allow authenticated signals reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated signals reads" ON "public"."signals" FOR SELECT TO "authenticated" USING (true);


--
-- Name: signals Allow authenticated signals updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated signals updates" ON "public"."signals" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: team_members Allow authenticated team_members inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated team_members inserts" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: team_members Allow authenticated team_members reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated team_members reads" ON "public"."team_members" FOR SELECT TO "authenticated" USING (true);


--
-- Name: team_members Allow authenticated team_members updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated team_members updates" ON "public"."team_members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: teams Allow authenticated teams inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated teams inserts" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: teams Allow authenticated teams reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated teams reads" ON "public"."teams" FOR SELECT TO "authenticated" USING (true);


--
-- Name: teams Allow authenticated teams updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated teams updates" ON "public"."teams" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: trust_reports Allow authenticated trust_reports inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated trust_reports inserts" ON "public"."trust_reports" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: trust_reports Allow authenticated trust_reports reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated trust_reports reads" ON "public"."trust_reports" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_reports Allow authenticated trust_reports updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated trust_reports updates" ON "public"."trust_reports" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: verification_cases Allow authenticated verification_cases inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_cases inserts" ON "public"."verification_cases" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: verification_cases Allow authenticated verification_cases reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_cases reads" ON "public"."verification_cases" FOR SELECT TO "authenticated" USING (true);


--
-- Name: verification_cases Allow authenticated verification_cases updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_cases updates" ON "public"."verification_cases" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: verification_passports Allow authenticated verification_passports inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_passports inserts" ON "public"."verification_passports" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: verification_passports Allow authenticated verification_passports reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_passports reads" ON "public"."verification_passports" FOR SELECT TO "authenticated" USING (true);


--
-- Name: verification_passports Allow authenticated verification_passports updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated verification_passports updates" ON "public"."verification_passports" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: waitlist Allow authenticated waitlist inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated waitlist inserts" ON "public"."waitlist" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: waitlist Allow authenticated waitlist reads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated waitlist reads" ON "public"."waitlist" FOR SELECT TO "authenticated" USING (true);


--
-- Name: waitlist Allow authenticated waitlist updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated waitlist updates" ON "public"."waitlist" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: enterprise_access_requests Allow public enterprise access submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public enterprise access submissions" ON "public"."enterprise_access_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: waitlist Allow public waitlist inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public waitlist inserts" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: hopae_verifications Users can insert own Hopae verifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own Hopae verifications" ON "public"."hopae_verifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: hopae_verifications Users can view own Hopae verifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own Hopae verifications" ON "public"."hopae_verifications" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: api_test_runs admin insert api test runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin insert api test runs" ON "public"."api_test_runs" FOR INSERT TO "authenticated" WITH CHECK ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: integration_status admin insert integration status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin insert integration status" ON "public"."integration_status" FOR INSERT TO "authenticated" WITH CHECK ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: agent_permissions admin manage agent_permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage agent_permissions" ON "public"."agent_permissions" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: agents admin manage agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage agents" ON "public"."agents" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: api_keys admin manage api_keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage api_keys" ON "public"."api_keys" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: appeals admin manage appeals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage appeals" ON "public"."appeals" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: knowledge_articles admin manage knowledge_articles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage knowledge_articles" ON "public"."knowledge_articles" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: launch_control_notes admin manage launch control notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage launch control notes" ON "public"."launch_control_notes" TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")) WITH CHECK ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: message_events admin manage message_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage message_events" ON "public"."message_events" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: message_threads admin manage message_threads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage message_threads" ON "public"."message_threads" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: notifications admin manage notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage notifications" ON "public"."notifications" TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")) WITH CHECK ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: trust_assistant_questions admin manage trust_assistant_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage trust_assistant_questions" ON "public"."trust_assistant_questions" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: trust_events admin manage trust_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin manage trust_events" ON "public"."trust_events" TO "authenticated" USING (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"))) WITH CHECK (((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text")));


--
-- Name: api_test_runs admin read api test runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin read api test runs" ON "public"."api_test_runs" FOR SELECT TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: integration_status admin read integration status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin read integration status" ON "public"."integration_status" FOR SELECT TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'admin'::"text"));


--
-- Name: admin_reviews admin reviews owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin reviews owner insert" ON "public"."admin_reviews" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: admin_reviews admin reviews owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin reviews owner select" ON "public"."admin_reviews" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: admin_reviews admin reviews owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin reviews owner update" ON "public"."admin_reviews" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: admin_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."admin_reviews" ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_activity; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agent_activity" ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_activity_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agent_activity_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_passports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agent_passports" ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agent_permissions" ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: agents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_agents" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_governance_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_governance_runs" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agents ai_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ai_insert" ON "public"."ai_agents" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: ai_agents ai_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ai_select" ON "public"."ai_agents" FOR SELECT TO "authenticated" USING (true);


--
-- Name: enterprise_access_requests anon can request enterprise access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon can request enterprise access" ON "public"."enterprise_access_requests" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: waitlist anon insert waitlist; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "anon insert waitlist" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;

--
-- Name: api_test_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."api_test_runs" ENABLE ROW LEVEL SECURITY;

--
-- Name: appeals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."appeals" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_chains authenticated insert evidence_chains; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert evidence_chains" ON "public"."evidence_chains" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: operational_intelligence_events authenticated insert operational_intelligence_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert operational_intelligence_events" ON "public"."operational_intelligence_events" FOR INSERT TO "authenticated" WITH CHECK ((("workspace_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "operational_intelligence_events"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "operational_intelligence_events"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])))))));


--
-- Name: trust_algorithm_runs authenticated insert trust algorithm runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust algorithm runs" ON "public"."trust_algorithm_runs" FOR INSERT TO "authenticated" WITH CHECK (("subject_type" = ANY (ARRAY['passport'::"text", 'agent'::"text"])));


--
-- Name: trust_assistant_questions authenticated insert trust assistant questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust assistant questions" ON "public"."trust_assistant_questions" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: trust_assistant_questions authenticated insert trust_assistant_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust_assistant_questions" ON "public"."trust_assistant_questions" FOR INSERT TO "authenticated" WITH CHECK (("asked_by_user_id" = "auth"."uid"()));


--
-- Name: trust_relationships authenticated insert trust_relationships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust_relationships" ON "public"."trust_relationships" FOR INSERT TO "authenticated" WITH CHECK (("relationship_type" = ANY (ARRAY['submitted_evidence'::"text", 'reviewed_by'::"text", 'linked_to'::"text", 'generated_signal'::"text", 'owned_by'::"text", 'verified_by'::"text", 'escalated_to'::"text", 'connected_activity'::"text"])));


--
-- Name: trust_replay_sessions authenticated insert trust_replay_sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust_replay_sessions" ON "public"."trust_replay_sessions" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: trust_timeline_events authenticated insert trust_timeline_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert trust_timeline_events" ON "public"."trust_timeline_events" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: verification_receipts authenticated insert verification_receipts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated insert verification_receipts" ON "public"."verification_receipts" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: audit_logs authenticated manage audit_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage audit_logs" ON "public"."audit_logs" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: autonomy_profiles authenticated manage autonomy_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage autonomy_profiles" ON "public"."autonomy_profiles" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: data_rights_requests authenticated manage data rights requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage data rights requests" ON "public"."data_rights_requests" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: data_rights_requests authenticated manage data_rights_requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage data_rights_requests" ON "public"."data_rights_requests" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: decisions authenticated manage decisions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage decisions" ON "public"."decisions" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: enterprise_access_requests authenticated manage enterprise access requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage enterprise access requests" ON "public"."enterprise_access_requests" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: evidence_files authenticated manage evidence_files; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage evidence_files" ON "public"."evidence_files" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: execution_passports authenticated manage execution_passports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage execution_passports" ON "public"."execution_passports" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: feedback_reports authenticated manage feedback_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage feedback_reports" ON "public"."feedback_reports" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: governance_actions authenticated manage governance_actions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage governance_actions" ON "public"."governance_actions" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: governance_policies authenticated manage governance_policies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage governance_policies" ON "public"."governance_policies" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: help_questions authenticated manage help_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage help_questions" ON "public"."help_questions" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: intent_requests authenticated manage intent_requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage intent_requests" ON "public"."intent_requests" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: interest_signals authenticated manage interest_signals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage interest_signals" ON "public"."interest_signals" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: knowledge_articles authenticated manage knowledge articles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage knowledge articles" ON "public"."knowledge_articles" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: passport_state_checks authenticated manage passport_state_checks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage passport_state_checks" ON "public"."passport_state_checks" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: passports authenticated manage passports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage passports" ON "public"."passports" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: risk_scores authenticated manage risk_scores; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage risk_scores" ON "public"."risk_scores" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: signals authenticated manage signals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage signals" ON "public"."signals" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: system_health_checks authenticated manage system health checks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage system health checks" ON "public"."system_health_checks" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: trust_graph_edges authenticated manage trust_graph_edges; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage trust_graph_edges" ON "public"."trust_graph_edges" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: trust_graph_nodes authenticated manage trust_graph_nodes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage trust_graph_nodes" ON "public"."trust_graph_nodes" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: trust_reports authenticated manage trust_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage trust_reports" ON "public"."trust_reports" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: verification_cases authenticated manage verification_cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated manage verification_cases" ON "public"."verification_cases" TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: trust_assistant_questions authenticated own read trust assistant questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated own read trust assistant questions" ON "public"."trust_assistant_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "asked_by_user_id"));


--
-- Name: trust_assistant_questions authenticated own read trust_assistant_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated own read trust_assistant_questions" ON "public"."trust_assistant_questions" FOR SELECT TO "authenticated" USING (("asked_by_user_id" = "auth"."uid"()));


--
-- Name: knowledge_articles authenticated read approved knowledge articles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read approved knowledge articles" ON "public"."knowledge_articles" FOR SELECT TO "authenticated" USING (("status" = 'approved'::"text"));


--
-- Name: knowledge_articles authenticated read approved knowledge_articles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read approved knowledge_articles" ON "public"."knowledge_articles" FOR SELECT TO "authenticated" USING (("status" = 'approved'::"text"));


--
-- Name: audit_logs authenticated read audit_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read audit_logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);


--
-- Name: evidence_chains authenticated read evidence_chains; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read evidence_chains" ON "public"."evidence_chains" FOR SELECT TO "authenticated" USING (true);


--
-- Name: operational_intelligence_events authenticated read operational_intelligence_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read operational_intelligence_events" ON "public"."operational_intelligence_events" FOR SELECT TO "authenticated" USING ((("workspace_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "operational_intelligence_events"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "operational_intelligence_events"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));


--
-- Name: passports authenticated read passports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read passports" ON "public"."passports" FOR SELECT TO "authenticated" USING (true);


--
-- Name: signals authenticated read signals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read signals" ON "public"."signals" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_algorithm_runs authenticated read trust algorithm runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read trust algorithm runs" ON "public"."trust_algorithm_runs" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_relationships authenticated read trust_relationships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read trust_relationships" ON "public"."trust_relationships" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_replay_sessions authenticated read trust_replay_sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read trust_replay_sessions" ON "public"."trust_replay_sessions" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_reports authenticated read trust_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read trust_reports" ON "public"."trust_reports" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_timeline_events authenticated read trust_timeline_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read trust_timeline_events" ON "public"."trust_timeline_events" FOR SELECT TO "authenticated" USING (true);


--
-- Name: verification_cases authenticated read verification_cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read verification_cases" ON "public"."verification_cases" FOR SELECT TO "authenticated" USING (true);


--
-- Name: verification_receipts authenticated read verification_receipts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated read verification_receipts" ON "public"."verification_receipts" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_workspaces authenticated users create own workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "authenticated users create own workspaces" ON "public"."trust_workspaces" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: autonomy_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."autonomy_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_customers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;

--
-- Name: candidate_profiles candidate profiles owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "candidate profiles owner insert" ON "public"."candidate_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: candidate_profiles candidate profiles owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "candidate profiles owner select" ON "public"."candidate_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: candidate_profiles candidate profiles owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "candidate profiles owner update" ON "public"."candidate_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: candidate_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."candidate_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: cookie_consent_receipts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."cookie_consent_receipts" ENABLE ROW LEVEL SECURITY;

--
-- Name: cookie_consent_receipts cookie_consent_receipts_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "cookie_consent_receipts_select_own" ON "public"."cookie_consent_receipts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: data_rights_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."data_rights_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: decisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."decisions" ENABLE ROW LEVEL SECURITY;

--
-- Name: device_channel_evidence; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."device_channel_evidence" ENABLE ROW LEVEL SECURITY;

--
-- Name: enterprise_access_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."enterprise_access_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_chains; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."evidence_chains" ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_files; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."evidence_files" ENABLE ROW LEVEL SECURITY;

--
-- Name: execution_passports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."execution_passports" ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feedback_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: governance_actions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."governance_actions" ENABLE ROW LEVEL SECURITY;

--
-- Name: governance_policies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."governance_policies" ENABLE ROW LEVEL SECURITY;

--
-- Name: help_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."help_questions" ENABLE ROW LEVEL SECURITY;

--
-- Name: hopae_verifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."hopae_verifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: hopae_webhook_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."hopae_webhook_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: injection_risk_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."injection_risk_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."integration_status" ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."intent_requests" ENABLE ROW LEVEL SECURITY;

--
-- Name: interest_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."interest_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: interview_risk_events interview risk events owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk events owner insert" ON "public"."interview_risk_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_risk_events"."interview_session_id") AND ("interview_sessions"."user_id" = "auth"."uid"())))));


--
-- Name: interview_risk_events interview risk events owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk events owner select" ON "public"."interview_risk_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_risk_events"."interview_session_id") AND ("interview_sessions"."user_id" = "auth"."uid"())))));


--
-- Name: interview_risk_events interview risk events owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk events owner update" ON "public"."interview_risk_events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_risk_events"."interview_session_id") AND ("interview_sessions"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_risk_events"."interview_session_id") AND ("interview_sessions"."user_id" = "auth"."uid"())))));


--
-- Name: interview_risk_signals interview risk signals owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk signals owner insert" ON "public"."interview_risk_signals" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: interview_risk_signals interview risk signals owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk signals owner select" ON "public"."interview_risk_signals" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: interview_risk_signals interview risk signals owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview risk signals owner update" ON "public"."interview_risk_signals" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: interview_sessions interview sessions owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview sessions owner insert" ON "public"."interview_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: interview_sessions interview sessions owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview sessions owner select" ON "public"."interview_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: interview_sessions interview sessions owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "interview sessions owner update" ON "public"."interview_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: interview_risk_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."interview_risk_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: interview_risk_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."interview_risk_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: interview_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."interview_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_articles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."knowledge_articles" ENABLE ROW LEVEL SECURITY;

--
-- Name: launch_control_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."launch_control_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: liveness_checks liveness checks owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "liveness checks owner insert" ON "public"."liveness_checks" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: liveness_checks liveness checks owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "liveness checks owner select" ON "public"."liveness_checks" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: liveness_checks liveness checks owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "liveness checks owner update" ON "public"."liveness_checks" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: liveness_checks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."liveness_checks" ENABLE ROW LEVEL SECURITY;

--
-- Name: message_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."message_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: message_threads; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: operational_intelligence_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."operational_intelligence_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: passport_state_checks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."passport_state_checks" ENABLE ROW LEVEL SECURITY;

--
-- Name: passports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."passports" ENABLE ROW LEVEL SECURITY;

--
-- Name: provenance_events pe_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pe_insert" ON "public"."provenance_events" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: provenance_events pe_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "pe_select" ON "public"."provenance_events" FOR SELECT TO "authenticated" USING (true);


--
-- Name: provenance_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."provenance_assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: provenance_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."provenance_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: provenance_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."provenance_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: enterprise_access_requests public insert enterprise access requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public insert enterprise access requests" ON "public"."enterprise_access_requests" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: interest_signals public insert interest_signals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public insert interest_signals" ON "public"."interest_signals" FOR INSERT TO "anon" WITH CHECK (true);


--
-- Name: recruiter_profiles recruiter profiles owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "recruiter profiles owner insert" ON "public"."recruiter_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: recruiter_profiles recruiter profiles owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "recruiter profiles owner select" ON "public"."recruiter_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: recruiter_profiles recruiter profiles owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "recruiter profiles owner update" ON "public"."recruiter_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: recruiter_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."recruiter_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_scores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."risk_scores" ENABLE ROW LEVEL SECURITY;

--
-- Name: runtime_validation_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."runtime_validation_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: session_integrity_checks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."session_integrity_checks" ENABLE ROW LEVEL SECURITY;

--
-- Name: signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: system_health_checks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."system_health_checks" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_alerts ta_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ta_insert" ON "public"."trust_alerts" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: trust_alerts ta_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ta_select" ON "public"."trust_alerts" FOR SELECT TO "authenticated" USING (true);


--
-- Name: trust_certifications tc_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tc_insert" ON "public"."trust_certifications" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: trust_certifications tc_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "tc_select" ON "public"."trust_certifications" FOR SELECT TO "authenticated" USING (true);


--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_scores trust scores owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "trust scores owner insert" ON "public"."trust_scores" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: trust_scores trust scores owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "trust scores owner select" ON "public"."trust_scores" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: trust_scores trust scores owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "trust scores owner update" ON "public"."trust_scores" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: trust_alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_alerts" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_algorithm_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_algorithm_runs" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_assistant_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_assistant_questions" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_case_relationships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_case_relationships" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_cases" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_certifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_certifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_explanations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_explanations" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_graph_edges; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_graph_edges" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_graph_nodes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_graph_nodes" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_relationships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_relationships" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_replay_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_replay_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_scores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_scores" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_timeline_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_timeline_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_workspaces; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."trust_workspaces" ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_limits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."usage_limits" ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_customers users can read own billing customers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users can read own billing customers" ON "public"."billing_customers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: subscriptions users can read own subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users can read own subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: usage_limits users can read own usage limits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users can read own usage limits" ON "public"."usage_limits" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: agent_permissions users create own agent_permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users create own agent_permissions" ON "public"."agent_permissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "agent_permissions"."agent_id") AND ("agents"."owner_user_id" = "auth"."uid"())))));


--
-- Name: notifications users create own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users create own notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: trust_events users create own trust_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users create own trust_events" ON "public"."trust_events" FOR INSERT TO "authenticated" WITH CHECK ((("agent_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "trust_events"."agent_id") AND ("agents"."owner_user_id" = "auth"."uid"()))))));


--
-- Name: agent_activity users insert own agent activity; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users insert own agent activity" ON "public"."agent_activity" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_agents"
  WHERE (("ai_agents"."id" = "agent_activity"."agent_id") AND ("ai_agents"."owner_user_id" = "auth"."uid"())))));


--
-- Name: agents users manage own agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own agents" ON "public"."agents" TO "authenticated" USING (("owner_user_id" = "auth"."uid"())) WITH CHECK (("owner_user_id" = "auth"."uid"()));


--
-- Name: ai_agents users manage own ai agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own ai agents" ON "public"."ai_agents" TO "authenticated" USING (("owner_user_id" = "auth"."uid"())) WITH CHECK (("owner_user_id" = "auth"."uid"()));


--
-- Name: api_keys users manage own api_keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own api_keys" ON "public"."api_keys" TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR ("user_id" = "auth"."uid"()))) WITH CHECK ((("owner_user_id" = "auth"."uid"()) OR ("user_id" = "auth"."uid"())));


--
-- Name: appeals users manage own appeals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own appeals" ON "public"."appeals" TO "authenticated" USING (("submitted_by_user_id" = "auth"."uid"())) WITH CHECK (("submitted_by_user_id" = "auth"."uid"()));


--
-- Name: message_events users manage own message_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own message_events" ON "public"."message_events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."message_threads"
  WHERE (("message_threads"."id" = "message_events"."thread_id") AND ("message_threads"."created_by_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."message_threads"
  WHERE (("message_threads"."id" = "message_events"."thread_id") AND ("message_threads"."created_by_user_id" = "auth"."uid"())))));


--
-- Name: message_threads users manage own message_threads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users manage own message_threads" ON "public"."message_threads" TO "authenticated" USING (("created_by_user_id" = "auth"."uid"())) WITH CHECK (("created_by_user_id" = "auth"."uid"()));


--
-- Name: agent_activity users read own agent activity; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users read own agent activity" ON "public"."agent_activity" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ai_agents"
  WHERE (("ai_agents"."id" = "agent_activity"."agent_id") AND ("ai_agents"."owner_user_id" = "auth"."uid"())))));


--
-- Name: agent_permissions users read own agent_permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users read own agent_permissions" ON "public"."agent_permissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "agent_permissions"."agent_id") AND ("agents"."owner_user_id" = "auth"."uid"())))));


--
-- Name: notifications users read own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users read own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: trust_events users read own trust_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users read own trust_events" ON "public"."trust_events" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "trust_events"."agent_id") AND ("agents"."owner_user_id" = "auth"."uid"())))) OR (("metadata" ->> 'owner_user_id'::"text") = ("auth"."uid"())::"text")));


--
-- Name: notifications users update own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: verification_events verification events owner insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "verification events owner insert" ON "public"."verification_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: verification_events verification events owner select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "verification events owner select" ON "public"."verification_events" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: verification_events verification events owner update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "verification events owner update" ON "public"."verification_events" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: verification_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_cases" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_flags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_flags" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_passports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_passports" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_receipts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_receipts" ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."verification_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."voice_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;

--
-- Name: webcam_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."webcam_signals" ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_cases workspace members create trust cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace members create trust cases" ON "public"."trust_cases" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))))));


--
-- Name: trust_case_relationships workspace members read case relationships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace members read case relationships" ON "public"."trust_case_relationships" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trust_cases"
  WHERE (("trust_cases"."id" = "trust_case_relationships"."case_id") AND (("trust_cases"."created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."trust_workspaces"
          WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_members"
          WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"())))))))));


--
-- Name: trust_cases workspace members read trust cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace members read trust cases" ON "public"."trust_cases" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));


--
-- Name: trust_workspaces workspace owners and members read workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace owners and members read workspaces" ON "public"."trust_workspaces" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "trust_workspaces"."id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));


--
-- Name: workspace_members workspace owners and self add members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace owners and self add members" ON "public"."workspace_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "workspace_members"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"()))))));


--
-- Name: workspace_members workspace owners update members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace owners update members" ON "public"."workspace_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "workspace_members"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "workspace_members"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))));


--
-- Name: trust_workspaces workspace owners update workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace owners update workspaces" ON "public"."trust_workspaces" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: workspace_members workspace participants read members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace participants read members" ON "public"."workspace_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "workspace_members"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"()))))));


--
-- Name: trust_case_relationships workspace reviewers create case relationships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace reviewers create case relationships" ON "public"."trust_case_relationships" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."trust_cases"
  WHERE (("trust_cases"."id" = "trust_case_relationships"."case_id") AND ((EXISTS ( SELECT 1
           FROM "public"."trust_workspaces"
          WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_members"
          WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])))))))))));


--
-- Name: trust_cases workspace reviewers update trust cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "workspace reviewers update trust cases" ON "public"."trust_cases" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."trust_workspaces"
  WHERE (("trust_workspaces"."id" = "trust_cases"."workspace_id") AND ("trust_workspaces"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "trust_cases"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])))))));


--
-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "record_cookie_consent"("p_anonymous_id" "uuid", "p_session_id" "uuid", "p_consent_version" "text", "p_analytics" boolean, "p_marketing" boolean, "p_preferences" boolean, "p_source" "text", "p_idempotency_key" "uuid", "p_country_code" "text", "p_ip_hash" "text", "p_user_agent_hash" "text", "p_metadata" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."record_cookie_consent"("p_anonymous_id" "uuid", "p_session_id" "uuid", "p_consent_version" "text", "p_analytics" boolean, "p_marketing" boolean, "p_preferences" boolean, "p_source" "text", "p_idempotency_key" "uuid", "p_country_code" "text", "p_ip_hash" "text", "p_user_agent_hash" "text", "p_metadata" "jsonb") FROM PUBLIC;


--
-- Name: FUNCTION "submit_enterprise_access_request"("p_name" "text", "p_email" "text", "p_company" "text", "p_role" "text", "p_message" "text", "p_use_case" "text", "p_urgency" "text", "p_company_size" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."submit_enterprise_access_request"("p_name" "text", "p_email" "text", "p_company" "text", "p_role" "text", "p_message" "text", "p_use_case" "text", "p_urgency" "text", "p_company_size" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_enterprise_access_request"("p_name" "text", "p_email" "text", "p_company" "text", "p_role" "text", "p_message" "text", "p_use_case" "text", "p_urgency" "text", "p_company_size" "text") TO "authenticated";


--
-- Name: TABLE "admin_reviews"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_reviews" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_reviews" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_reviews" TO "service_role";


--
-- Name: TABLE "agent_activity"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."agent_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_activity" TO "service_role";


--
-- Name: TABLE "agent_activity_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_activity_logs" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_activity_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_activity_logs" TO "service_role";


--
-- Name: TABLE "agent_passports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_passports" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_passports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_passports" TO "service_role";


--
-- Name: TABLE "agent_permissions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."agent_permissions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_permissions" TO "service_role";


--
-- Name: TABLE "agent_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_profiles" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agent_profiles" TO "service_role";


--
-- Name: TABLE "agents"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."agents" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agents" TO "service_role";


--
-- Name: TABLE "ai_agents"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."ai_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agents" TO "service_role";


--
-- Name: TABLE "ai_governance_runs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_governance_runs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_governance_runs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_governance_runs" TO "service_role";


--
-- Name: TABLE "api_keys"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."api_keys" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."api_keys" TO "authenticated";


--
-- Name: TABLE "api_test_runs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."api_test_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_test_runs" TO "service_role";


--
-- Name: TABLE "appeals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."appeals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."appeals" TO "service_role";


--
-- Name: TABLE "audit_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_events" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_events" TO "service_role";


--
-- Name: TABLE "audit_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";


--
-- Name: TABLE "autonomy_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."autonomy_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."autonomy_profiles" TO "service_role";


--
-- Name: TABLE "billing_customers"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_customers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."billing_customers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_customers" TO "service_role";


--
-- Name: TABLE "candidate_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."candidate_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."candidate_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."candidate_profiles" TO "service_role";


--
-- Name: TABLE "cookie_consent_receipts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cookie_consent_receipts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cookie_consent_receipts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cookie_consent_receipts" TO "service_role";


--
-- Name: TABLE "data_rights_requests"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."data_rights_requests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."data_rights_requests" TO "service_role";


--
-- Name: TABLE "decisions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."decisions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."decisions" TO "authenticated";


--
-- Name: TABLE "device_channel_evidence"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."device_channel_evidence" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."device_channel_evidence" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."device_channel_evidence" TO "service_role";


--
-- Name: TABLE "enterprise_access_requests"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."enterprise_access_requests" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."enterprise_access_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."enterprise_access_requests" TO "service_role";


--
-- Name: COLUMN "enterprise_access_requests"."name"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("name") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."work_email"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("work_email") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."company"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("company") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."role"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("role") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."use_case"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("use_case") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."message"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("message") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."status"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("status") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."company_size"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("company_size") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."current_problem"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("current_problem") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."ai_usage_level"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("ai_usage_level") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."current_problem_category"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("current_problem_category") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."design_partner_interest"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("design_partner_interest") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."governance_interest"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("governance_interest") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: COLUMN "enterprise_access_requests"."operational_ai_interest"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT("operational_ai_interest") ON TABLE "public"."enterprise_access_requests" TO "anon";


--
-- Name: TABLE "evidence_chains"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evidence_chains" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_chains" TO "service_role";


--
-- Name: TABLE "evidence_files"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evidence_files" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."evidence_files" TO "authenticated";


--
-- Name: TABLE "execution_passports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."execution_passports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."execution_passports" TO "service_role";


--
-- Name: TABLE "feedback_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedback_reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."feedback_reports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedback_reports" TO "service_role";


--
-- Name: TABLE "governance_actions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."governance_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."governance_actions" TO "service_role";


--
-- Name: TABLE "governance_policies"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."governance_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."governance_policies" TO "service_role";


--
-- Name: TABLE "help_questions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."help_questions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."help_questions" TO "service_role";


--
-- Name: TABLE "hopae_verifications"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_verifications" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_verifications" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_verifications" TO "service_role";


--
-- Name: TABLE "hopae_webhook_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_webhook_events" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_webhook_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."hopae_webhook_events" TO "service_role";


--
-- Name: TABLE "injection_risk_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."injection_risk_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."injection_risk_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."injection_risk_events" TO "service_role";


--
-- Name: TABLE "integration_status"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."integration_status" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_status" TO "service_role";


--
-- Name: TABLE "intent_requests"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."intent_requests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."intent_requests" TO "service_role";


--
-- Name: TABLE "interest_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interest_signals" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."interest_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."interest_signals" TO "service_role";


--
-- Name: TABLE "interview_risk_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."interview_risk_events" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_risk_events" TO "service_role";


--
-- Name: TABLE "interview_risk_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_risk_signals" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_risk_signals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_risk_signals" TO "service_role";


--
-- Name: TABLE "interview_sessions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."interview_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_sessions" TO "service_role";


--
-- Name: TABLE "knowledge_articles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."knowledge_articles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."knowledge_articles" TO "service_role";


--
-- Name: TABLE "launch_control_notes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."launch_control_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."launch_control_notes" TO "service_role";


--
-- Name: TABLE "liveness_checks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."liveness_checks" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."liveness_checks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."liveness_checks" TO "service_role";


--
-- Name: TABLE "message_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."message_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."message_events" TO "service_role";


--
-- Name: TABLE "message_threads"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."message_threads" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."message_threads" TO "service_role";


--
-- Name: TABLE "notifications"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";


--
-- Name: TABLE "operational_intelligence_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."operational_intelligence_events" TO "authenticated";
GRANT ALL ON TABLE "public"."operational_intelligence_events" TO "service_role";


--
-- Name: TABLE "passport_state_checks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."passport_state_checks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."passport_state_checks" TO "service_role";


--
-- Name: TABLE "passports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."passports" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."passports" TO "authenticated";


--
-- Name: TABLE "provenance_assets"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_assets" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_assets" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_assets" TO "service_role";


--
-- Name: TABLE "provenance_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_events" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_events" TO "service_role";


--
-- Name: TABLE "provenance_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_reports" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_reports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provenance_reports" TO "service_role";


--
-- Name: TABLE "recruiter_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recruiter_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."recruiter_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recruiter_profiles" TO "service_role";


--
-- Name: TABLE "risk_scores"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."risk_scores" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."risk_scores" TO "authenticated";


--
-- Name: TABLE "runtime_validation_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."runtime_validation_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."runtime_validation_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."runtime_validation_logs" TO "service_role";


--
-- Name: TABLE "session_integrity_checks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_integrity_checks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."session_integrity_checks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_integrity_checks" TO "service_role";


--
-- Name: TABLE "signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."signals" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."signals" TO "authenticated";


--
-- Name: TABLE "subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."subscriptions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."subscriptions" TO "service_role";


--
-- Name: TABLE "system_health_checks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."system_health_checks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."system_health_checks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."system_health_checks" TO "service_role";


--
-- Name: TABLE "team_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."team_members" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."team_members" TO "authenticated";


--
-- Name: TABLE "teams"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teams" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."teams" TO "authenticated";


--
-- Name: TABLE "trust_alerts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_alerts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_alerts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_alerts" TO "service_role";


--
-- Name: TABLE "trust_algorithm_runs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_algorithm_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_algorithm_runs" TO "service_role";


--
-- Name: TABLE "trust_assistant_questions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_assistant_questions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_assistant_questions" TO "service_role";


--
-- Name: TABLE "trust_case_relationships"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_case_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_case_relationships" TO "service_role";


--
-- Name: TABLE "trust_cases"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_cases" TO "service_role";


--
-- Name: TABLE "trust_certifications"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_certifications" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_certifications" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_certifications" TO "service_role";


--
-- Name: TABLE "trust_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_events" TO "service_role";


--
-- Name: TABLE "trust_explanations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_explanations" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_explanations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_explanations" TO "service_role";


--
-- Name: TABLE "trust_graph_edges"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_graph_edges" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_graph_edges" TO "service_role";


--
-- Name: TABLE "trust_graph_nodes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_graph_nodes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_graph_nodes" TO "service_role";


--
-- Name: TABLE "trust_relationships"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_relationships" TO "service_role";


--
-- Name: TABLE "trust_replay_sessions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_replay_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_replay_sessions" TO "service_role";


--
-- Name: TABLE "trust_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_reports" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."trust_reports" TO "authenticated";


--
-- Name: TABLE "trust_scores"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_scores" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_scores" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_scores" TO "service_role";


--
-- Name: TABLE "trust_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_signals" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_signals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_signals" TO "service_role";


--
-- Name: TABLE "trust_timeline_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trust_timeline_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_timeline_events" TO "service_role";


--
-- Name: TABLE "trust_workspaces"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."trust_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."trust_workspaces" TO "service_role";


--
-- Name: TABLE "usage_limits"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."usage_limits" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."usage_limits" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."usage_limits" TO "service_role";


--
-- Name: TABLE "verification_cases"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_cases" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."verification_cases" TO "authenticated";


--
-- Name: TABLE "verification_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_events" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_events" TO "service_role";


--
-- Name: TABLE "verification_flags"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_flags" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_flags" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_flags" TO "service_role";


--
-- Name: TABLE "verification_passports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_passports" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."verification_passports" TO "authenticated";


--
-- Name: TABLE "verification_receipts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_receipts" TO "service_role";


--
-- Name: TABLE "verification_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_signals" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."verification_signals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."verification_signals" TO "service_role";


--
-- Name: TABLE "voice_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voice_signals" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voice_signals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voice_signals" TO "service_role";


--
-- Name: TABLE "waitlist"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."waitlist" TO "service_role";
GRANT INSERT ON TABLE "public"."waitlist" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."waitlist" TO "authenticated";


--
-- Name: TABLE "webcam_signals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."webcam_signals" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."webcam_signals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."webcam_signals" TO "service_role";


--
-- Name: TABLE "workspace_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

\unrestrict Tcs1ZHWUPFNsiFjcTlkfTDGl0SZbD7HzeZ2brhbkxMrKRs6rXvIKOWYSOokcsvm
