import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { writeReplayEvent } from "@/lib/replay/replay-writer";
import { publishTrustEvent } from "@/lib/events/event-bus";
import { evaluateGeoSessionIntelligence, geoSessionInputFromHeaders } from "@/lib/runtime/geo-session-intelligence";

export type AuthReplayEventType =
  | "login"
  | "logout"
  | "reset_password"
  | "mfa_challenge"
  | "geo_mismatch"
  | "step_up_auth"
  | "blocked_session"
  | "suspicious_login"
  | "session_restoration";

const titles: Record<AuthReplayEventType, string> = {
  login: "Authentication login",
  logout: "Authentication logout",
  reset_password: "Password reset completed",
  mfa_challenge: "MFA challenge created",
  geo_mismatch: "Geo mismatch reviewed",
  step_up_auth: "Step-up authentication requested",
  blocked_session: "Session blocked",
  suspicious_login: "Suspicious login reviewed",
  session_restoration: "Session restored",
};

export async function recordAuthReplayEvent(
  supabase: SupabaseClient,
  input: {
    user: User;
    eventType: AuthReplayEventType;
    request?: Request;
    decision?: "allow" | "step_up" | "review" | "block";
    trustPosture?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const geoSession = input.request
    ? evaluateGeoSessionIntelligence(geoSessionInputFromHeaders(input.request.headers))
    : null;
  const decision = input.decision ?? geoSession?.decision ?? "allow";
  const actor = input.user.email ?? input.user.id;
  const metadata = {
    actor_id: input.user.id,
    actor_email: input.user.email ?? null,
    actor_type: "human",
    authority_actor: input.user.email ?? input.user.id,
    auth_event_type: input.eventType,
    decision,
    action_reason:
      decision === "block"
        ? "Authentication event reached a blocking session-risk state."
        : decision === "step_up"
          ? "Authentication event requires step-up verification before workflow access continues."
          : decision === "review"
            ? "Authentication event requires governed review because session context changed."
            : "Authentication event retained for session continuity.",
    trust_posture: input.trustPosture ?? geoSession?.posture ?? "unknown",
    geo_session: geoSession,
    session_risk: geoSession
      ? {
          decision: geoSession.decision,
          posture: geoSession.posture,
          geo_mismatch: geoSession.geo_mismatch,
          new_device: geoSession.new_device,
          source_labels: geoSession.source_labels,
        }
      : null,
    governance_review_required: decision === "review" || decision === "step_up" || decision === "block",
    replay_writer: "auth_replay_events",
    secrets_included: false,
    ...input.metadata,
  };

  await createAuditLog(supabase, `auth_${input.eventType}`, actor, metadata);
  publishTrustEvent(
    "auth.trust_event",
    {
      actor_id: input.user.id,
      auth_event_type: input.eventType,
      decision,
      trust_posture: metadata.trust_posture,
      governance_review_required: metadata.governance_review_required,
    },
    { replaySafe: true }
  );

  return writeReplayEvent(supabase, {
    subjectType: "auth_session",
    subjectId: input.user.id,
    eventType: `auth_${input.eventType}`,
    eventTitle: titles[input.eventType],
    eventSummary:
      input.eventType === "geo_mismatch" || geoSession?.geo_mismatch
        ? "Authentication event retained geo/session context for governed review."
        : "Authentication event retained session continuity, device context and trust posture.",
    actorType: "human",
    actorId: input.user.id,
    severity: decision === "block" ? "critical" : decision === "review" || decision === "step_up" ? "warning" : "info",
    metadata,
  });
}
