import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateTrustAuthentication } from "@/lib/auth/trust-authentication";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = evaluateTrustAuthentication({
    authenticatedUser: true,
    verifiedHuman: body.verified_human !== false,
    verifiedAgent: body.verified_agent !== false,
    authorizedNhi: body.authorized_nhi !== false,
    activeSessionIntegrity: body.active_session_integrity !== false,
    permissionScope: ["matched", "overbroad", "mismatch", "unknown"].includes(String(body.permission_scope))
      ? (String(body.permission_scope) as any)
      : "unknown",
    trustPosture: String(body.trust_posture ?? "unknown") as any,
    trustScore: typeof body.trust_score === "number" ? body.trust_score : null,
    threshold: typeof body.threshold === "number" ? body.threshold : 65,
    governanceLock: body.governance_lock === true,
  });

  await createAuditLog(supabase, "trust_authentication_checked", user.email ?? user.id, {
    ...result,
    actor_id: user.id,
    replay_event_required: result.replay_event_required,
  });

  return NextResponse.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
}
