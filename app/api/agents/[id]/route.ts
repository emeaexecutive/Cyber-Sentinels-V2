import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  demoAgents,
  normalizeAgent,
  type AgentRow,
} from "@/lib/trust-engine/agentRegistry";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .limit(1)
      .returns<AgentRow[]>();

    if (error || !data?.[0]) {
      const demoAgent = demoAgents.find((agent) => agent.id === id);

      if (!demoAgent) {
        return NextResponse.json(
          { ok: false, error: "Agent not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        agent: demoAgent,
        tableAvailable: false,
      });
    }

    return NextResponse.json({
      ok: true,
      agent: normalizeAgent(data[0]),
      tableAvailable: true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not retrieve agent" },
      { status: 500 }
    );
  }
}
