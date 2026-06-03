import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import type { AgentIdentity } from "@/lib/ai-trust/types";

async function getAgent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user, error: "Unauthorized" as const, agent: null };
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgentIdentity>();

  if (error || !agent) {
    return { supabase, user, error: "Not found" as const, agent: null };
  }

  if (agent.owner_user_id !== user.id && !isAdminAllowlisted(user.email)) {
    return { supabase, user, error: "Forbidden" as const, agent: null };
  }

  return { supabase, user, error: null, agent };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = await getAgent(id);

  if (result.error === "Unauthorized") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (result.error === "Forbidden") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (result.error) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, agent: result.agent });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = await getAgent(id);

  if (result.error === "Unauthorized") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (result.error === "Forbidden") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (result.error || !result.agent || !result.user) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
  }

  const payload = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  ["name", "purpose", "model_provider", "model_name", "permission_scope", "status"].forEach((field) => {
    if (payload[field] !== undefined) {
      update[field] = String(payload[field]).trim();
    }
  });

  if (payload.trust_score !== undefined) {
    update.trust_score = Number(payload.trust_score);
  }

  if (update.name) {
    update.agent_name = update.name;
  }

  if (update.purpose) {
    update.declared_purpose = update.purpose;
  }

  if (update.model_name) {
    update.model_family = update.model_name;
  }

  const { data: agent, error } = await result.supabase
    .from("agents")
    .update(update)
    .eq("id", id)
    .select("*")
    .single<AgentIdentity>();

  if (error || !agent) {
    return NextResponse.json(
      { ok: false, error: "Could not update agent" },
      { status: 500 }
    );
  }

  const actor = result.user.email ?? result.user.id;
  const metadata = { agent_id: id, actor };

  await createAuditLog(result.supabase, "agent_updated", actor, metadata);
  await createSignal(result.supabase, "Agent updated", metadata);

  return NextResponse.json({ ok: true, agent });
}
