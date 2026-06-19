import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

const alertTypes = new Set([
  "live_trust_alert",
  "behavioural_drift",
  "verification_failure",
  "suspicious_login",
  "suspicious_activity",
  "ai_agent_permission_escalation",
  "workflow_anomaly",
  "synthetic_identity_flag",
]);

const statuses = new Set(["active", "in_review", "resolved", "dismissed"]);

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

async function payload(req: Request) {
  return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
}

function idFrom(req: Request, body?: Record<string, unknown>) {
  return text(body?.id) || new URL(req.url).searchParams.get("id") || "";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("trust_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isAdminAllowlisted(user.email)) query = query.eq("created_by", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not load alerts" }, { status: 500 });
  return NextResponse.json({ ok: true, alerts: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await payload(req);
  const alertType = text(body.alert_type);
  const status = text(body.status, "active");
  const title = text(body.alert_title ?? body.title);

  if (!alertTypes.has(alertType)) {
    return NextResponse.json({ ok: false, error: "Invalid alert_type" }, { status: 400 });
  }
  if (!statuses.has(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ ok: false, error: "alert_title is required" }, { status: 400 });

  const insert = {
    alert_type: alertType,
    status,
    subject_type: text(body.subject_type) || null,
    subject_id: text(body.subject_id) || null,
    enterprise_id: text(body.enterprise_id) || null,
    alert_title: title,
    alert_description: text(body.alert_description ?? body.description) || null,
    risk_level: text(body.risk_level, "medium"),
    source: text(body.source, "cyber_sentinels"),
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
    created_by: user.id,
    reviewed_by: text(body.reviewed_by) || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("trust_alerts").insert(insert).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not create alert" }, { status: 500 });
  return NextResponse.json({ ok: true, alert: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await payload(req);
  const id = idFrom(req, body);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of [
    "status",
    "alert_title",
    "alert_description",
    "risk_level",
    "source",
    "metadata",
    "reviewed_by",
    "resolved_at",
  ]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.status && !statuses.has(String(patch.status))) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  let query = supabase.from("trust_alerts").update(patch).eq("id", id);
  if (!isAdminAllowlisted(user.email)) query = query.eq("created_by", user.id);

  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not update alert" }, { status: 500 });
  return NextResponse.json({ ok: true, alert: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const id = idFrom(req);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  let query = supabase.from("trust_alerts").delete().eq("id", id);
  if (!isAdminAllowlisted(user.email)) query = query.eq("created_by", user.id);
  const { error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not delete alert" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
