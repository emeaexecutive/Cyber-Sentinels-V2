import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const certificationTypes = new Set([
  "verified_human",
  "verified_executive",
  "verified_ai_agent",
  "verified_recruiter",
  "verified_workflow",
  "verified_enterprise",
]);

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

  const query = supabase
    .from("trust_certifications")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not load certifications" }, { status: 500 });

  return NextResponse.json({ ok: true, certifications: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await payload(req);
  const certificationType = text(body.certification_type);

  if (!certificationTypes.has(certificationType)) {
    return NextResponse.json({ ok: false, error: "Invalid certification_type" }, { status: 400 });
  }

  const insert = {
    certification_type: certificationType,
    status: "pending",
    trust_score: 50,
    risk_level: text(body.risk_level, "medium"),
    verification_method: text(body.verification_method, "governance_review"),
    subject_type: text(body.subject_type) || null,
    subject_id: text(body.subject_id) || null,
    enterprise_id: text(body.enterprise_id) || null,
    issued_at: null,
    expires_at: null,
    reviewed_by: null,
    notes: text(body.notes) || null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trust_certifications")
    .insert(insert)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: "Could not create certification" }, { status: 500 });
  return NextResponse.json({ ok: true, certification: data }, { status: 201 });
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

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.notes !== undefined) patch.notes = text(body.notes).slice(0, 1000) || null;

  const query = supabase.from("trust_certifications").update(patch).eq("id", id).eq("created_by", user.id);

  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not update certification" }, { status: 500 });
  return NextResponse.json({ ok: true, certification: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const id = idFrom(req);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const query = supabase.from("trust_certifications").delete().eq("id", id).eq("created_by", user.id);

  const { error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not delete certification" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
