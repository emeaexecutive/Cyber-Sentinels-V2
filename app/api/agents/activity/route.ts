import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const agentId = new URL(req.url).searchParams.get("agent_id");
  let query = supabase
    .from("trust_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  if (!isAdminAllowlisted(user.email)) {
    query = query.eq("metadata->>owner_user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("agent activity lookup failed", error);
    return NextResponse.json({ ok: false, error: "Could not read activity" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activity: data ?? [] });
}

