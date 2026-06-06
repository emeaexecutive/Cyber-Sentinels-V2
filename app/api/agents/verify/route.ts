import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { agent_id?: unknown };
  const agentId = String(body.agent_id ?? "").trim();

  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agent_id is required" }, { status: 400 });
  }

  let query = supabase.from("agents").select("*").eq("id", agentId);

  if (!isAdminAllowlisted(user.email)) {
    query = query.eq("owner_user_id", user.id);
  }

  const { data: agent, error } = await query.maybeSingle();

  if (error || !agent) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
  }

  const trustScore = Number(agent.trust_score ?? 50);

  return NextResponse.json({
    ok: true,
    agent_id: agentId,
    verified: trustScore >= 70,
    trust_score: trustScore,
    status: agent.status ?? "pending",
  });
}

