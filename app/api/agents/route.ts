import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  demoAgents,
  normalizeAgent,
  normalizeAgents,
  permissionScopes,
  type AgentPermissionScope,
  type AgentRow,
} from "@/lib/trust-engine/agentRegistry";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

function safeText(value: unknown, fallback: string, maxLength = 160) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function safePermissions(value: unknown): AgentPermissionScope[] {
  if (!Array.isArray(value)) return ["read_profile"];

  return value.filter((item): item is AgentPermissionScope =>
    permissionScopes.includes(item as AgentPermissionScope)
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AgentRow[]>();

    if (error) {
      return NextResponse.json({
        ok: true,
        agents: demoAgents,
        tableAvailable: false,
      });
    }

    return NextResponse.json({
      ok: true,
      agents: data?.length ? normalizeAgents(data) : demoAgents,
      tableAvailable: true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve agents" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const payload: AgentRow = {
      agent_name: safeText(body.agent_name, "New AI Agent"),
      agent_type: safeText(body.agent_type, "general_agent"),
      owner_name: safeText(body.owner_name, user.email ?? user.id),
      owner_email: safeText(body.owner_email, user.email ?? user.id),
      model_provider: safeText(body.model_provider, "unknown"),
      model_family: safeText(body.model_family, "unknown"),
      declared_purpose: safeText(
        body.declared_purpose,
        "Placeholder agent registration"
      ),
      permissions: safePermissions(body.permissions),
      risk_level: "medium",
      trust_score: 50,
      origin_trace_score: 50,
      policy_status: "pending_policy_review",
      status: "pending",
    };
    const { data, error } = await supabase
      .from("agents")
      .insert(payload)
      .select("*")
      .returns<AgentRow[]>();

    const agent = error || !data?.[0]
      ? normalizeAgent({
          id: "placeholder-agent",
          ...payload,
          created_at: new Date().toISOString(),
        })
      : normalizeAgent(data[0]);

    await createSignal(supabase, "agent_registered");
    await createAuditLog(
      supabase,
      "agent_registry_created",
      user.email ?? user.id,
      {
        agent_id: agent.id,
        agent_name: agent.agent_name,
        table_available: !error,
      }
    );

    return NextResponse.json(
      { ok: true, agent, tableAvailable: !error },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid agent input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create agent" },
      { status: 500 }
    );
  }
}
