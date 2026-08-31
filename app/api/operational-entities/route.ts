import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntities } from "@/lib/operational-entities/server";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { DelegatedAuthorityServerError, registerCanonicalNativeAgent } from "@/lib/operational-entities/delegated-authority-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const entities = await loadOperationalEntities({ supabase, user });
    return NextResponse.json({ ok: true, entities }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Operational Entity read failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    return NextResponse.json({ ok: false, error: "operational_entities_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== "register_native_agent") return NextResponse.json({ ok: false, error: "OPERATIONAL_ENTITY_ACTION_UNSUPPORTED" }, { status: 400 });
    const result = await registerCanonicalNativeAgent(context, body);
    return NextResponse.json({ ok: true, result }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IdentityApiError || error instanceof DelegatedAuthorityServerError) return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
    if (error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ ok: false, error: "OPERATIONAL_ENTITY_INPUT_INVALID" }, { status: 400 });
    console.error("Operational Entity registration failed.", { code: (error as { code?: string })?.code });
    return NextResponse.json({ ok: false, error: "operational_entity_registration_unavailable" }, { status: 503 });
  }
}
