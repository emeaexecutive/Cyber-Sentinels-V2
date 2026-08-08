import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { generateDeterministicGovernanceAnalysis, generateGovernanceAnalysis, type GovernanceContext, type GovernanceSubjectType } from "@/lib/ai/governanceAssistant";
import { hasOpenAIKey, getOperationalOpenAIModel } from "@/lib/ai/openai";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getSafeSameOriginUrl } from "@/lib/security";
import {
  evaluateAIProviderPolicy,
  normalizeDataClassification,
  providerPolicyAuditMetadata,
  redactForAIProvider,
} from "@/lib/ai/provider-policy";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function metadata(row: AnyRow) {
  const value = row.metadata;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function linkedToPassport(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const meta = metadata(row);
  const rowPassportId = text(row.passport_id ?? meta.passport_id);
  const rowCaseId = text(row.verification_case_id ?? row.case_id ?? meta.verification_case_id);

  return rowPassportId === passportId || (rowCaseId ? caseIds.has(rowCaseId) : false);
}

function rowLabel(row: AnyRow, fields: string[]) {
  const label = fields.map((field) => text(row[field])).find(Boolean);
  return label || text(row.id) || "Recorded item";
}

function latestLabels(rows: AnyRow[], fields: string[]) {
  return rows.slice(0, 8).map((row) => rowLabel(row, fields));
}

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  }

  const formData = await req.formData();
  return Object.fromEntries(formData.entries()) as Record<string, unknown>;
}

function wantsHtml(req: Request) {
  return (req.headers.get("accept") ?? "").includes("text/html");
}

async function loadPassportGovernanceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string,
  userEmail: string | null | undefined
) {
  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle<AnyRow>();

  if (!passport) return { error: "Passport not found", status: 404 as const };

  if (
    passport.user_email &&
    passport.user_email !== userEmail &&
    !isAdminAllowlisted(userEmail)
  ) {
    return { error: "Forbidden", status: 403 as const };
  }

  const { data: verificationCases } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("passport_id", id)
    .order("created_at", { ascending: false })
    .returns<AnyRow[]>();
  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => text(item.id)));

  const [
    { data: passportEvidence },
    { data: caseEvidence },
    { data: passportDecisions },
    { data: caseDecisions },
    { data: signalRows },
    { data: auditRows },
    { data: appeals },
    { data: latestTrustRun },
  ] = await Promise.all([
    supabase
      .from("evidence_files")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<AnyRow[]>(),
    caseIds.size
      ? supabase
          .from("evidence_files")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .returns<AnyRow[]>()
      : Promise.resolve({ data: [] as AnyRow[] }),
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<AnyRow[]>(),
    caseIds.size
      ? supabase
          .from("decisions")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .returns<AnyRow[]>()
      : Promise.resolve({ data: [] as AnyRow[] }),
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<AnyRow[]>(),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<AnyRow[]>(),
    supabase
      .from("appeals")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<AnyRow[]>(),
    supabase
      .from("trust_algorithm_runs")
      .select("*")
      .eq("subject_type", "passport")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AnyRow>(),
  ]);

  const evidenceById = new Map<string, AnyRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((row) =>
    evidenceById.set(text(row.id), row)
  );
  const evidence = [...evidenceById.values()];
  const decisionById = new Map<string, AnyRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((row) =>
    decisionById.set(text(row.id), row)
  );
  const decisions = [...decisionById.values()];
  const signals = (signalRows ?? []).filter((row) => linkedToPassport(row, id, caseIds));
  const auditLogs = (auditRows ?? []).filter((row) => linkedToPassport(row, id, caseIds));
  const acceptedEvidence = evidence.filter((row) =>
    ["accepted", "approved", "clean", "verified"].includes(normalized(row.status ?? row.scan_status))
  );
  const unresolvedSignals = signals.filter((row) =>
    /unresolved|manual|risk|critical|high|missing|review/i.test(text(row.event))
  );

  const context: GovernanceContext = {
    subject_type: "passport",
    subject_id: id,
    subject_label: text(passport.subject_name) || "Unnamed passport",
    verification_status: text(passport.verification_status ?? passport.review_status ?? passport.status),
    evidence_count: evidence.length,
    accepted_evidence_count: acceptedEvidence.length,
    decision_count: decisions.length,
    audit_event_count: auditLogs.length,
    signal_count: signals.length,
    unresolved_signal_count: unresolvedSignals.length,
    appeal_count: (appeals ?? []).length,
    trust_algorithm: latestTrustRun
      ? {
          score: Number(latestTrustRun.score ?? 0),
          confidence_level: text(latestTrustRun.confidence_level),
          explanation: text(latestTrustRun.explanation),
          recommended_action: text(latestTrustRun.recommended_action),
        }
      : null,
    recent_evidence: latestLabels(evidence, ["status", "scan_status", "file_name", "file_url"]),
    recent_decisions: latestLabels(decisions, ["decision", "status", "notes"]),
    recent_audit_events: latestLabels(auditLogs, ["event_type", "actor"]),
    recent_signals: latestLabels(signals, ["event"]),
  };

  return { context, actor: userEmail ?? userId };
}

async function loadAgentGovernanceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string,
  userEmail: string | null | undefined
) {
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AnyRow>();

  if (!agent) return { error: "Agent not found", status: 404 as const };

  if (agent.owner_user_id !== userId && !isAdminAllowlisted(userEmail)) {
    return { error: "Forbidden", status: 403 as const };
  }

  const [
    { data: events },
    { data: permissions },
    { data: signalRows },
    { data: auditRows },
    { data: latestTrustRun },
  ] = await Promise.all([
    supabase
      .from("trust_events")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AnyRow[]>(),
    supabase
      .from("agent_permissions")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AnyRow[]>(),
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<AnyRow[]>(),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<AnyRow[]>(),
    supabase
      .from("trust_algorithm_runs")
      .select("*")
      .eq("subject_type", "agent")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AnyRow>(),
  ]);

  const signals = (signalRows ?? []).filter((row) => text(metadata(row).agent_id) === id);
  const auditLogs = (auditRows ?? []).filter((row) => text(metadata(row).agent_id) === id);
  const unresolvedSignals = [
    ...(events ?? []).filter((row) =>
      /high|critical|suspicious|unknown|unsigned|unverified|anomaly|review/i.test(
        `${row.risk_level ?? ""} ${row.event_type ?? ""}`
      )
    ),
    ...signals.filter((row) => /risk|critical|high|missing|review|suspicious/i.test(text(row.event))),
  ];

  const context: GovernanceContext = {
    subject_type: "agent",
    subject_id: id,
    subject_label: text(agent.name ?? agent.agent_name) || "Unnamed agent",
    verification_status: text(agent.status ?? agent.verification_status ?? agent.policy_status),
    audit_event_count: auditLogs.length + (events ?? []).length,
    signal_count: signals.length + (events ?? []).length,
    unresolved_signal_count: unresolvedSignals.length,
    trust_algorithm: latestTrustRun
      ? {
          score: Number(latestTrustRun.score ?? 0),
          confidence_level: text(latestTrustRun.confidence_level),
          explanation: text(latestTrustRun.explanation),
          recommended_action: text(latestTrustRun.recommended_action),
        }
      : null,
    recent_activity: latestLabels(events ?? [], ["event_type", "risk_level", "event_source"]),
    recent_audit_events: latestLabels(auditLogs, ["event_type", "actor"]),
    recent_signals: latestLabels(signals, ["event"]),
    permissions: latestLabels(permissions ?? [], ["permission_name", "permission_scope", "risk_level", "status"]),
  };

  return { context, actor: userEmail ?? userId };
}

export async function POST(req: Request) {
  const payload = await readPayload(req);
  const subjectType = text(payload.subject_type) as GovernanceSubjectType;
  const subjectId = text(payload.subject_id);

  if (!["passport", "agent"].includes(subjectType) || !subjectId) {
    return NextResponse.json(
      { ok: false, error: "subject_type and subject_id are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const classification = normalizeDataClassification(payload.data_classification);
  const policyDecision = evaluateAIProviderPolicy({ classification });
  const policyMetadata = providerPolicyAuditMetadata(policyDecision);
  const actor = user.email ?? user.id;
  const governanceOverrideReason = text(payload.governance_override_reason);

  if (governanceOverrideReason) {
    await createAuditLog(supabase, "ai_provider_governance_override_requested", actor, {
      subject_type: subjectType,
      subject_id: subjectId,
      override_reason_recorded: true,
      override_authorized: isAdminAllowlisted(user.email),
      override_bypassed_policy: false,
      ...policyMetadata,
    });
  }

  await createAuditLog(supabase, "ai_provider_policy_evaluated", actor, {
    subject_type: subjectType,
    subject_id: subjectId,
    ...policyMetadata,
  });

  if (!policyDecision.allowed) {
    await createAuditLog(supabase, "restricted_data_egress_blocked", actor, {
      subject_type: subjectType,
      subject_id: subjectId,
      ...policyMetadata,
    });
    return NextResponse.json(
      { ok: false, error: "AI provider use blocked by enterprise data policy." },
      { status: 403 }
    );
  }

  const loaded =
    subjectType === "passport"
      ? await loadPassportGovernanceContext(supabase, subjectId, user.id, user.email)
      : await loadAgentGovernanceContext(supabase, subjectId, user.id, user.email);

  if ("error" in loaded) {
    return NextResponse.json(
      { ok: false, error: loaded.error },
      { status: loaded.status }
    );
  }

  let analysis;
  let analysisMode: "AI_GROUNDED" | "DETERMINISTIC" = "DETERMINISTIC";
  const governedContext = redactForAIProvider(loaded.context) as GovernanceContext;

  if (hasOpenAIKey()) {
    await createAuditLog(supabase, "ai_provider_interaction_started", loaded.actor, {
      subject_type: subjectType,
      subject_id: subjectId,
      redaction_applied: true,
      ...policyMetadata,
    });
    try {
      analysis = await generateGovernanceAnalysis(governedContext);
      analysisMode = "AI_GROUNDED";
    } catch (error) {
      console.error("AI governance output rejected; deterministic fallback used", error);
      analysis = generateDeterministicGovernanceAnalysis(governedContext);
      await createAuditLog(supabase, "ai_provider_output_rejected", loaded.actor, {
        subject_type: subjectType,
        subject_id: subjectId,
        deterministic_fallback_used: true,
        redaction_applied: true,
        ...policyMetadata,
      });
    }
  } else {
    analysis = generateDeterministicGovernanceAnalysis(governedContext);
    await createAuditLog(supabase, "ai_deterministic_fallback_used", loaded.actor, {
      subject_type: subjectType,
      subject_id: subjectId,
      reason: "OPENAI_API_KEY_NOT_CONFIGURED",
      ...policyMetadata,
    });
  }
  const eventType = subjectType === "passport" ? "ai_summary_generated" : "governance_recommendation_created";
  const metadata = {
    subject_type: subjectType,
    subject_id: subjectId,
    provider_model: analysisMode === "AI_GROUNDED" ? getOperationalOpenAIModel() : "deterministic",
    analysis_mode: analysisMode,
    evidence_citations: analysis.citations,
    analysis_title: analysis.title,
    recommendation_count: analysis.recommendations.length,
    observation_count: analysis.observations.length,
    governance_boundary: analysis.governance_boundary,
    redaction_applied: true,
    operational_evidence_continuity: true,
    ...policyMetadata,
  };

  await createAuditLog(supabase, "ai_provider_interaction_completed", loaded.actor, metadata);
  await createAuditLog(supabase, eventType, loaded.actor, metadata);
  await createSignal(
    supabase,
    subjectType === "passport" ? "AI summary generated" : "Governance recommendation created",
    metadata
  );

  const anomalyRecommended = [
    ...analysis.observations,
    ...analysis.recommendations,
  ].some((value) => /anomaly|unusual|suspicious|unsigned|provenance/i.test(value));

  if (anomalyRecommended) {
    await createAuditLog(supabase, "anomaly_review_recommended", loaded.actor, metadata);
    await createSignal(supabase, "Anomaly review recommended", metadata);
  }

  if (wantsHtml(req)) {
    const redirectTarget = getSafeSameOriginUrl(
      req,
      req.headers.get("referer"),
      subjectType === "passport" ? `/passports/${subjectId}` : `/agents/${subjectId}`,
    );
    if (analysisMode === "DETERMINISTIC") redirectTarget.searchParams.set("ai_governance", "deterministic_mode");
    return NextResponse.redirect(redirectTarget, { status: 303 });
  }

  return NextResponse.json({ ok: true, analysis, mode: analysisMode });
}
