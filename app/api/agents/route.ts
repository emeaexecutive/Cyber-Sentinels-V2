import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function score(value: unknown, fallback = 50) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : fallback;
}

function jsonArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  }

  const formData = await req.formData();
  return Object.fromEntries(formData.entries()) as Record<string, unknown>;
}

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

function idFrom(req: Request, body?: Record<string, unknown>) {
  return text(body?.id) || new URL(req.url).searchParams.get("id") || "";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("ai_agents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isAdminAllowlisted(user.email)) {
    query = query.eq("owner_user_id", user.id);
  }

  const result = await query;

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve AI agents" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, agents: result.data ?? [], ai_agents: result.data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await readPayload(req);
  const agentName = text(payload.agent_name ?? payload.name);

  if (!agentName) {
    return NextResponse.json(
      { ok: false, error: "agent_name is required" },
      { status: 400 }
    );
  }

  const actor = user.email ?? user.id;
  const insert = {
    agent_name: agentName,
    owner_name: text(payload.owner_name, actor),
    owner_email: text(payload.owner_email, user.email ?? user.id),
    owner_user_id: user.id,
    enterprise_id: text(payload.enterprise_id) || null,
    agent_type: text(payload.agent_type, "enterprise_assistant"),
    capabilities: jsonArray(payload.capabilities, ["workflow_review"]),
    permissions: jsonArray(payload.permissions, ["review_only"]),
    trust_score: score(payload.trust_score),
    status: text(payload.status, "pending"),
    verification_status: text(payload.verification_status ?? payload.status, "pending"),
    declared_purpose: text(payload.declared_purpose ?? payload.purpose, "Enterprise trust and governance support"),
    operational_scope: text(payload.operational_scope ?? payload.permission_scope, "review_only"),
    last_activity_at: text(payload.last_activity_at) || null,
  };

  const { data: agent, error } = await supabase
    .from("ai_agents")
    .insert(insert)
    .select("*")
    .single();

  if (error || !agent) {
    console.error("AI agent registry insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create AI agent" },
      { status: 500 }
    );
  }

  const eventMetadata = {
    agent_id: agent.id,
    actor,
    owner_user_id: user.id,
    registry: "ai_agents",
  };

  await bestEffort("legacy agent mirror insert", async () => {
    await supabase.from("agents").insert({
      name: agentName,
      agent_name: agentName,
      owner_email: insert.owner_email,
      owner_user_id: user.id,
      owner_name: insert.owner_name,
      purpose: insert.declared_purpose,
      declared_purpose: insert.declared_purpose,
      permission_scope: insert.operational_scope,
      status: insert.status,
      trust_score: insert.trust_score,
      metadata: eventMetadata,
    });
  });

  await bestEffort("AI agent trust event insert", async () => {
    await supabase.from("trust_events").insert({
      actor_type: "agent",
      actor_id: agent.id,
      actor_label: agent.agent_name,
      event_type: "ai_agent_registered",
      event_source: "api.agents",
      risk_level: "low",
      agent_id: agent.id,
      metadata: eventMetadata,
    });
  });

  await bestEffort("AI agent provenance event insert", async () => {
    await supabase.from("provenance_events").insert({
      subject_type: "ai_agent",
      subject_id: agent.id,
      event_type: "ai_agent_registered",
      event_title: "AI agent registered",
      event_description: "Enterprise AI agent was registered for trust governance review.",
      risk_level: "low",
      created_by: actor,
      metadata: eventMetadata,
    });
  });

  await createAuditLog(supabase, "ai_agent_registered", actor, eventMetadata);
  await createSignal(supabase, "AI agent registered", eventMetadata);

  await bestEffort("AI agent governance action insert", async () => {
    await supabase.from("governance_actions").insert({
      subject_type: "ai_agent",
      subject_id: agent.id,
      action_status: "pending",
      resolution_notes:
        "AI agent registered. Review owner, capabilities, permissions and trust score before approving enterprise use.",
    });
  });

  await bestEffort("AI agent trust case insert", async () => {
    await supabase.from("trust_cases").insert({
      title: `AI agent review: ${agent.agent_name ?? agentName}`,
      description:
        `AI agent capabilities, permissions and enterprise governance context require human review. Agent ID: ${agent.id}.`,
      status: "open",
      priority: "medium",
      created_by: user.id,
    });
  });

  await bestEffort("AI agent receipt bundle insert", async () => {
    await createReceiptBundle(supabase, {
      subjectType: "ai_agent",
      subjectId: agent.id,
      receiptType: "ai_agent_registered",
      verificationStatus: String(agent.status ?? "pending"),
      confidenceLevel: Number(agent.trust_score ?? 0) >= 70 ? "High Trust" : "In Review",
      issuedBy: user.id,
      receiptSummary:
        "AI agent was registered with owner, capabilities, permissions and human governance context.",
      chainSummary:
        "AI agent evidence chain links registry data, audit activity, flags and governance review.",
      evidenceSnapshot: {
        agent_id: agent.id,
        agent_name: agent.agent_name,
        owner_email: agent.owner_email,
        capabilities: agent.capabilities,
        permissions: agent.permissions,
        status: agent.status,
        trust_score: agent.trust_score,
        human_review: true,
      },
      evidence: [
        { type: "ai_agent", id: agent.id, status: agent.status },
        { type: "audit_log", event_type: "ai_agent_registered" },
        { type: "flag", event: "AI agent registered" },
      ],
    });
  });

  await bestEffort("AI agent replay insert", async () => {
    await supabase.from("trust_replay_sessions").insert({
      subject_type: "ai_agent",
      subject_id: agent.id,
      replay_summary:
        "Initial AI agent replay captures registry creation, audit logging, flag generation and pending governance review.",
      generated_by: "api.agents",
    });
  });

  return NextResponse.json({ ok: true, agent }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await readPayload(req);
  const id = idFrom(req, body);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const key of [
    "agent_name",
    "owner_name",
    "owner_email",
    "enterprise_id",
    "agent_type",
    "status",
    "verification_status",
    "declared_purpose",
    "operational_scope",
    "last_activity_at",
  ]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (body.capabilities !== undefined) patch.capabilities = jsonArray(body.capabilities);
  if (body.permissions !== undefined) patch.permissions = jsonArray(body.permissions);
  if (body.trust_score !== undefined) patch.trust_score = score(body.trust_score);

  let query = supabase.from("ai_agents").update(patch).eq("id", id);
  if (!isAdminAllowlisted(user.email)) query = query.eq("owner_user_id", user.id);

  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "Could not update AI agent" }, { status: 500 });
  return NextResponse.json({ ok: true, agent: data });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = idFrom(req);
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  let query = supabase.from("ai_agents").delete().eq("id", id);
  if (!isAdminAllowlisted(user.email)) query = query.eq("owner_user_id", user.id);
  const { error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Could not delete AI agent" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
