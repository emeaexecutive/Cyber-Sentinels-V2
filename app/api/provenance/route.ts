import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const subjectTypes = new Set(["human", "ai_agent", "workflow", "enterprise"]);

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

async function payload(req: Request) {
  return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
}

function idFrom(req: Request, body?: Record<string, unknown>) {
  return text(body?.id) || new URL(req.url).searchParams.get("id") || "";
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let query = supabase
    .from("provenance_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const subjectType = searchParams.get("subject_type");
  const subjectId = searchParams.get("subject_id");
  if (subjectType) query = query.eq("subject_type", subjectType);
  if (subjectId) query = query.eq("subject_id", subjectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not load provenance events" }, { status: 500 });
  return NextResponse.json({ ok: true, events: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await payload(req);
  const subjectType = text(body.subject_type);
  const eventType = text(body.event_type);
  const title = text(body.event_title);

  if (!subjectTypes.has(subjectType)) {
    return NextResponse.json({ ok: false, error: "Invalid subject_type" }, { status: 400 });
  }
  if (!eventType || !title) {
    return NextResponse.json({ ok: false, error: "event_type and event_title are required" }, { status: 400 });
  }

  const insert = {
    subject_type: subjectType,
    subject_id: text(body.subject_id) || null,
    event_type: eventType,
    event_title: title,
    event_description: text(body.event_description ?? body.description) || null,
    risk_level: text(body.risk_level, "low"),
    created_by: text(body.created_by, user.email ?? user.id),
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
  };

  const { data, error } = await supabase.from("provenance_events").insert(insert).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not create provenance event" }, { status: 500 });
  return NextResponse.json({ ok: true, event: data }, { status: 201 });
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

  const patch: Record<string, unknown> = {};
  for (const key of ["event_title", "event_description", "risk_level", "metadata"]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { data, error } = await supabase.from("provenance_events").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not update provenance event" }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const id = idFrom(req);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  const { error } = await supabase.from("provenance_events").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Could not delete provenance event" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
