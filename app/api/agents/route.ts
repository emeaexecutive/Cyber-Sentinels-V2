import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";
import type { AgentIdentity } from "@/lib/ai-trust/types";

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase.from("agents").select("*");

  if (!isAdminAllowlisted(user.email)) {
    query = query.eq("owner_user_id", user.id);
  }

  const result = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AgentIdentity[]>();

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve agents" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, agents: result.data ?? [] });
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
  const name = text(payload.name ?? payload.agent_name);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Agent name is required" },
      { status: 400 }
    );
  }

  const actor = user.email ?? user.id;
  const insert = {
    name,
    agent_name: name,
    owner_email: text(payload.owner_email, user.email ?? user.id),
    owner_user_id: user.id,
    owner_name: actor,
    purpose: text(payload.purpose ?? payload.declared_purpose, "AI trust workflow support"),
    declared_purpose: text(payload.purpose ?? payload.declared_purpose, "AI trust workflow support"),
    model_provider: text(payload.model_provider, "unknown"),
    model_name: text(payload.model_name ?? payload.model_family, "unknown"),
    model_family: text(payload.model_name ?? payload.model_family, "unknown"),
    permission_scope: text(payload.permission_scope, "review_only"),
    status: text(payload.status, "pending"),
    trust_score: Number(payload.trust_score ?? 50),
    metadata: {
      actor,
      source: "api.agents",
    },
  };

  const { data: agent, error } = await supabase
    .from("agents")
    .insert(insert)
    .select("*")
    .single<AgentIdentity>();

  if (error || !agent) {
    console.error("agent insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create agent" },
      { status: 500 }
    );
  }

  const eventMetadata = {
    agent_id: agent.id,
    actor,
    owner_user_id: user.id,
  };

  const { data: trustEvent } = await supabase
    .from("trust_events")
    .insert({
      actor_type: "agent",
      actor_id: agent.id,
      actor_label: agent.name,
      event_type: "agent_created",
      event_source: "api.agents",
      risk_level: "low",
      agent_id: agent.id,
      metadata: eventMetadata,
    })
    .select("id,event_type")
    .single();
  await createAuditLog(supabase, "agent_created", actor, eventMetadata);
  await createSignal(supabase, "Agent created", eventMetadata);
  await createAuditLog(supabase, "trust_event_created", actor, {
    ...eventMetadata,
    trust_event_id: trustEvent?.id,
    event_type: trustEvent?.event_type ?? "agent_created",
  });
  await createSignal(supabase, "Trust event created", {
    ...eventMetadata,
    trust_event_id: trustEvent?.id,
    event_type: trustEvent?.event_type ?? "agent_created",
  });

  await bestEffort("agent governance action insert", async () => {
    await supabase.from("governance_actions").insert({
      subject_type: "agent",
      subject_id: agent.id,
      action_status: "pending",
      resolution_notes:
        "Agent identity created. Review declared purpose, permission scope and trust events before approving autonomous use.",
    });
  });

  await bestEffort("agent trust case insert", async () => {
    await supabase.from("trust_cases").insert({
      title: `Agent identity review: ${agent.name ?? name}`,
      description:
        `Agent identity, governance scope, evidence context and operational activity require human review. Agent ID: ${agent.id}.`,
      status: "open",
      priority: "medium",
      created_by: user.id,
    });
  });

  await bestEffort("agent receipt bundle insert", async () => {
    await createReceiptBundle(supabase, {
      subjectType: "agent",
      subjectId: agent.id,
      receiptType: "agent_identity_registered",
      verificationStatus: String(agent.status ?? "pending"),
      confidenceLevel: Number(agent.trust_score ?? 0) >= 70 ? "High Trust" : "In Review",
      issuedBy: user.id,
      receiptSummary:
        "Agent identity was registered with declared purpose, permission scope and human governance context.",
      chainSummary:
        "Agent evidence chain links identity metadata, trust events, audit activity, signals and governance review.",
      evidenceSnapshot: {
        agent_id: agent.id,
        name: agent.name,
        declared_purpose: agent.purpose,
        permission_scope: agent.permission_scope,
        status: agent.status,
        trust_score: agent.trust_score,
        human_review: true,
      },
      evidence: [
        { type: "agent_identity", id: agent.id, status: agent.status },
        { type: "trust_event", id: trustEvent?.id ?? null, event_type: trustEvent?.event_type ?? "agent_created" },
        { type: "audit_log", event_type: "agent_created" },
        { type: "signal", event: "Agent created" },
      ],
    });
  });

  await bestEffort("agent replay insert", async () => {
    await supabase.from("trust_replay_sessions").insert({
      subject_type: "agent",
      subject_id: agent.id,
      replay_summary:
        "Initial agent replay captures identity registration, trust event creation, audit logging, signal generation and pending governance review.",
      generated_by: "api.agents",
    });
  });

  return NextResponse.json({ ok: true, agent }, { status: 201 });
}
