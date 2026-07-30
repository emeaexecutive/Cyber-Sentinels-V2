import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { trustEngine } from "@/lib/core/trust-engine";
import { createClient } from "@/lib/supabase/server";
import {
  type TrustAlgorithmRow,
  type TrustAlgorithmSubjectType,
} from "@/lib/trust-algorithm";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getSafeSameOriginUrl } from "@/lib/security";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  }

  const formData = await req.formData();
  return Object.fromEntries(formData.entries()) as Record<string, unknown>;
}

function metadata(row: TrustAlgorithmRow) {
  const value = row.metadata;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function linkedToPassport(row: TrustAlgorithmRow, passportId: string, caseIds: Set<string>) {
  const meta = metadata(row);
  const rowPassportId = text(row.passport_id ?? meta.passport_id);
  const rowCaseId = text(row.verification_case_id ?? row.case_id ?? meta.verification_case_id);

  return rowPassportId === passportId || (rowCaseId ? caseIds.has(rowCaseId) : false);
}

function wantsHtml(req: Request) {
  return (req.headers.get("accept") ?? "").includes("text/html");
}

async function loadPassportContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string,
  userEmail: string | null | undefined
) {
  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle<TrustAlgorithmRow>();

  if (!passport) {
    return { error: "Passport not found", status: 404 as const };
  }

  if (
    passport.user_email &&
    userEmail !== passport.user_email &&
    !isAdminAllowlisted(userEmail)
  ) {
    return { error: "Forbidden", status: 403 as const };
  }

  const { data: verificationCases } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("passport_id", id)
    .order("created_at", { ascending: false })
    .returns<TrustAlgorithmRow[]>();
  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => text(item.id)));

  const [{ data: passportEvidence }, { data: caseEvidence }] = await Promise.all([
    supabase
      .from("evidence_files")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<TrustAlgorithmRow[]>(),
    caseIds.size
      ? supabase
          .from("evidence_files")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .returns<TrustAlgorithmRow[]>()
      : Promise.resolve({ data: [] as TrustAlgorithmRow[] }),
  ]);
  const evidenceById = new Map<string, TrustAlgorithmRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((row) =>
    evidenceById.set(text(row.id), row)
  );

  const [{ data: passportDecisions }, { data: caseDecisions }] = await Promise.all([
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<TrustAlgorithmRow[]>(),
    caseIds.size
      ? supabase
          .from("decisions")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
          .returns<TrustAlgorithmRow[]>()
      : Promise.resolve({ data: [] as TrustAlgorithmRow[] }),
  ]);
  const decisionById = new Map<string, TrustAlgorithmRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((row) =>
    decisionById.set(text(row.id), row)
  );

  const [{ data: signalRows }, { data: auditRows }, { data: appeals }] = await Promise.all([
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<TrustAlgorithmRow[]>(),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<TrustAlgorithmRow[]>(),
    supabase
      .from("appeals")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false })
      .returns<TrustAlgorithmRow[]>(),
  ]);

  return {
    input: {
      subjectType: "passport" as const,
      subject: passport,
      verificationCases: cases,
      evidence: [...evidenceById.values()],
      decisions: [...decisionById.values()],
      signals: (signalRows ?? []).filter((row) => linkedToPassport(row, id, caseIds)),
      auditLogs: (auditRows ?? []).filter((row) => linkedToPassport(row, id, caseIds)),
      appeals: appeals ?? [],
    },
    actor: userEmail ?? userId,
  };
}

async function loadAgentContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string,
  userEmail: string | null | undefined
) {
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<TrustAlgorithmRow>();

  if (agent) {
    if (agent.owner_user_id !== userId && !isAdminAllowlisted(userEmail)) {
      return { error: "Forbidden", status: 403 as const };
    }

    const [{ data: trustEvents }, { data: permissions }, { data: signals }, { data: auditLogs }] =
      await Promise.all([
        supabase
          .from("trust_events")
          .select("*")
          .eq("agent_id", id)
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<TrustAlgorithmRow[]>(),
        supabase
          .from("agent_permissions")
          .select("*")
          .eq("agent_id", id)
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<TrustAlgorithmRow[]>(),
        supabase
          .from("signals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
          .returns<TrustAlgorithmRow[]>(),
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
          .returns<TrustAlgorithmRow[]>(),
      ]);

    const linkedSignals = (signals ?? []).filter((row) => text(metadata(row).agent_id) === id);
    const linkedAuditLogs = (auditLogs ?? []).filter((row) => text(metadata(row).agent_id) === id);

    return {
      input: {
        subjectType: "agent" as const,
        subject: agent,
        trustEvents: trustEvents ?? [],
        permissions: permissions ?? [],
        signals: linkedSignals,
        auditLogs: linkedAuditLogs,
      },
      actor: userEmail ?? userId,
    };
  }

  const { data: aiAgent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<TrustAlgorithmRow>();

  if (!aiAgent) {
    return { error: "Agent not found", status: 404 as const };
  }

  if (aiAgent.owner_user_id !== userId && !isAdminAllowlisted(userEmail)) {
    return { error: "Forbidden", status: 403 as const };
  }

  const [{ data: agentActivity }, { data: signals }, { data: auditLogs }] =
    await Promise.all([
      supabase
        .from("agent_activity")
        .select("*")
        .eq("agent_id", id)
        .order("created_at", { ascending: false })
        .limit(100)
        .returns<TrustAlgorithmRow[]>(),
      supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<TrustAlgorithmRow[]>(),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<TrustAlgorithmRow[]>(),
    ]);

  const linkedSignals = (signals ?? []).filter((row) => text(metadata(row).agent_id) === id);
  const linkedAuditLogs = (auditLogs ?? []).filter((row) => text(metadata(row).agent_id) === id);

  return {
    input: {
      subjectType: "agent" as const,
      subject: aiAgent,
      agentActivity: agentActivity ?? [],
      signals: linkedSignals,
      auditLogs: linkedAuditLogs,
    },
    actor: userEmail ?? userId,
  };
}

export async function POST(req: Request) {
  const payload = await readPayload(req);
  const subjectType = text(payload.subject_type) as TrustAlgorithmSubjectType;
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

  const context =
    subjectType === "passport"
      ? await loadPassportContext(supabase, subjectId, user.id, user.email)
      : await loadAgentContext(supabase, subjectId, user.id, user.email);

  if ("error" in context) {
    return NextResponse.json(
      { ok: false, error: context.error },
      { status: context.status }
    );
  }

  const result = trustEngine.calculateLegacyTrustPosture(context.input);
  const metadata = {
    subject_type: subjectType,
    subject_id: subjectId,
    score: result.score,
    confidence_level: result.confidence_level,
  };

  const { data: run, error } = await supabase
    .from("trust_algorithm_runs")
    .insert({
      subject_type: subjectType,
      subject_id: subjectId,
      score: result.score,
      confidence_level: result.confidence_level,
      positive_signals: result.positive_signals,
      negative_signals: result.negative_signals,
      missing_requirements: result.missing_requirements,
      recommended_action: result.recommended_action,
      explanation: result.explanation,
    })
    .select("*")
    .single<TrustAlgorithmRow>();

  if (error) {
    console.error("trust algorithm run insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not persist trust algorithm run" },
      { status: 500 }
    );
  }

  await createAuditLog(supabase, "trust_algorithm_run", context.actor, {
    ...metadata,
    trust_algorithm_run_id: run?.id,
  });
  await createSignal(supabase, "Trust algorithm evaluated", {
    ...metadata,
    trust_algorithm_run_id: run?.id,
  });

  if (wantsHtml(req)) {
    const fallbackPath =
      subjectType === "passport" ? `/passports/${subjectId}` : `/agents/${subjectId}`;
    const redirectTarget = getSafeSameOriginUrl(
      req,
      req.headers.get("referer"),
      fallbackPath,
    );
    return NextResponse.redirect(redirectTarget, { status: 303 });
  }

  return NextResponse.json({
    ok: true,
    id: run?.id,
    score: result.score,
    trust_score: result.trust_score,
    confidence_level: result.confidence_level,
    orchestration_summary:
      "Signals support review; governance and evidence orchestration determine operational trust posture.",
    explanation: result.explanation,
    positive_signals: result.positive_signals,
    negative_signals: result.negative_signals,
    missing_requirements: result.missing_requirements,
    recommended_action: result.recommended_action,
  });
}
