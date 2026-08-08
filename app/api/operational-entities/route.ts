import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntities } from "@/lib/operational-entities/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const entities = await loadOperationalEntities({ supabase, user });
    return NextResponse.json({ ok: true, entities }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Operational Entity read failed.", error);
    return NextResponse.json({ ok: false, error: "operational_entities_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
