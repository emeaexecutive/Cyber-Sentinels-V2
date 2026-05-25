import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  evaluateRevocationEngine,
  revocationSignals,
  revocationTriggers,
  type RevocationSubjectType,
  type RevocationTrigger,
} from "@/lib/trust-engine/revocationEngine";

const subjectTypes = [
  "human",
  "candidate",
  "passport",
  "agent",
  "api_key",
  "evidence",
  "clearance",
  "system",
] as const;

function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 160) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function getAllowed<T extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  allowed: T
) {
  const value = body[field];

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

function signalForAction(action: string) {
  if (action === "restrict_agent") return "agent_restricted";
  if (action === "pause_api_key") return "api_key_paused";
  if (action === "expire_clearance") return "clearance_expired";
  if (action === "lock_evidence") return "evidence_locked";
  if (action === "revoke_passport") return "trust_revoked";

  return "revocation_review_started";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid revocation request" },
        { status: 400 }
      );
    }

    const subjectType = getAllowed(
      body,
      "subject_type",
      subjectTypes
    ) as RevocationSubjectType;
    const subjectId = getRequiredText(body, "subject_id");
    const triggerReason = getAllowed(
      body,
      "trigger_reason",
      revocationTriggers
    ) as RevocationTrigger;
    const result = evaluateRevocationEngine({
      subject_type: subjectType,
      subject_id: subjectId,
      trigger_reason: triggerReason,
    });
    const supabase = await createClient();
    const signal = signalForAction(result.revocation_action);

    // Production should require privileged authorization before applying actions.
    await createSignal(supabase, signal);
    await createAuditLog(supabase, "revocation_evaluated", "revocation_api", {
      subject_type: subjectType,
      subject_id: subjectId,
      trigger_reason: triggerReason,
      revocation_action: result.revocation_action,
      status: result.status,
    });

    return NextResponse.json({
      ok: true,
      revocation_action: result.revocation_action,
      status: result.status,
      reason_codes: result.reason_codes,
      recommended_next_step: result.recommended_next_step,
      signals: revocationSignals,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid revocation request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not evaluate revocation" },
      { status: 500 }
    );
  }
}
