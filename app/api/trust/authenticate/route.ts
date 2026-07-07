import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateTrustAuthentication } from "@/lib/auth/trust-authentication";
import { recordAuthReplayEvent } from "@/lib/auth/auth-replay-events";
import {
  evaluateGeoSessionIntelligence,
  geoSessionInputFromHeaders,
} from "@/lib/runtime/geo-session-intelligence";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { publishTrustEvent } from "@/lib/events/event-bus";
import { setTrustCache } from "@/lib/cache/trust-cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const geoSession = evaluateGeoSessionIntelligence(
    geoSessionInputFromHeaders(request.headers, {
      previousCountry: typeof body.previous_country === "string" ? body.previous_country : undefined,
      previousDevice: typeof body.previous_device === "string" ? body.previous_device : undefined,
      knownDevice: typeof body.known_device === "boolean" ? body.known_device : undefined,
      governanceLock: body.governance_lock === true,
    })
  );
  const result = evaluateTrustAuthentication({
    authenticatedUser: true,
    verifiedEmail: Boolean(user.email_confirmed_at || user.confirmed_at),
    verifiedPhoneOrMfa: body.verified_phone_or_mfa === true,
    verifiedHuman: body.verified_human !== false,
    verifiedAgent: body.verified_agent !== false,
    authorizedNhi: body.authorized_nhi !== false,
    activeSessionIntegrity: body.active_session_integrity !== false,
    geoSession,
    permissionScope: ["matched", "overbroad", "mismatch", "unknown"].includes(String(body.permission_scope))
      ? (String(body.permission_scope) as any)
      : "unknown",
    trustPosture: String(body.trust_posture ?? "unknown") as any,
    trustScore: typeof body.trust_score === "number" ? body.trust_score : null,
    riskPosture: ["low", "medium", "high", "critical", "unknown"].includes(String(body.risk_posture))
      ? (String(body.risk_posture) as any)
      : "unknown",
    threshold: typeof body.threshold === "number" ? body.threshold : 65,
    governanceLock: body.governance_lock === true,
  });

  await createAuditLog(supabase, "trust_authentication_checked", user.email ?? user.id, {
    ...result,
    actor_id: user.id,
    replay_event_required: result.replay_event_required,
    geo_session: geoSession,
  });
  setTrustCache("session_integrity", user.id, {
    decision: result.decision,
    trust_inputs: result.trust_inputs,
    geo_session: geoSession,
    source_labels: result.source_labels,
    updated_at: new Date().toISOString(),
  }, { ttlMs: 10 * 60 * 1000, replaySafe: true });
  publishTrustEvent("session.risk_updated", {
    actor_id: user.id,
    decision: result.decision,
    trust_posture: result.trust_inputs.trust_posture,
    geo_decision: geoSession.decision,
  }, { replaySafe: true });

  if (result.replay_event_required || geoSession.geo_mismatch) {
    await recordAuthReplayEvent(supabase, {
      user,
      eventType: result.decision === "block"
        ? "blocked_session"
        : geoSession.geo_mismatch
          ? "geo_mismatch"
          : result.decision === "step_up"
            ? "step_up_auth"
            : "suspicious_login",
      request,
      decision: result.decision,
      trustPosture: String(body.trust_posture ?? geoSession.posture),
      metadata: {
        trust_authentication: result,
        geo_session: geoSession,
      },
    });
  }

  return NextResponse.json({ ok: true, ...result, geo_session: geoSession }, { headers: { "cache-control": "no-store" } });
}
