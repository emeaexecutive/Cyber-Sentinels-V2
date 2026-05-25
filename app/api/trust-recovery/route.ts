import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  evaluateTrustRecovery,
  recoveryTriggers,
  type RecoverySubjectType,
  type RecoveryTrigger,
} from "@/lib/trust-engine/trustRecovery";

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
const riskLevels = ["low", "medium", "high", "critical"] as const;

function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 240) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function getOptionalText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 1000) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function getAllowed<T extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  allowed: T,
  fallback?: T[number]
) {
  const value = body[field] ?? fallback;

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

function signalForStatus(status: string) {
  if (status === "approved") return "trust_recovery_approved";
  if (status === "denied") return "trust_recovery_denied";
  if (status === "restored") return "trust_restored";
  if (status === "evidence_required") {
    return "trust_recovery_evidence_submitted";
  }

  return "trust_recovery_requested";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid recovery request" },
        { status: 400 }
      );
    }

    const subjectType = getAllowed(
      body,
      "subject_type",
      subjectTypes
    ) as RecoverySubjectType;
    const subjectId = getRequiredText(body, "subject_id");
    const recoveryReason = getAllowed(
      body,
      "recovery_reason",
      recoveryTriggers
    ) as RecoveryTrigger;
    const submittedEvidence = getOptionalText(body, "submitted_evidence");
    const riskLevel = getAllowed(body, "risk_level", riskLevels, "high");
    const result = evaluateTrustRecovery({
      subject_type: subjectType,
      subject_id: subjectId,
      recovery_reason: recoveryReason,
      submitted_evidence: submittedEvidence,
      risk_level: riskLevel,
    });
    const supabase = await createClient();

    // High-risk recovery is only evaluated here; restoration must happen in an admin workflow.
    await createSignal(supabase, signalForStatus(result.recovery_status));
    await createAuditLog(
      supabase,
      "trust_recovery_requested",
      "trust_recovery_api",
      {
        subject_type: subjectType,
        subject_id: subjectId,
        recovery_reason: recoveryReason,
        recovery_status: result.recovery_status,
        risk_level: riskLevel,
        evidence_submitted: Boolean(submittedEvidence),
      }
    );

    return NextResponse.json({
      ok: true,
      recovery_status: result.recovery_status,
      required_next_steps: result.required_next_steps,
      recommended_action: result.recommended_action,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid recovery request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not evaluate trust recovery" },
      { status: 500 }
    );
  }
}
