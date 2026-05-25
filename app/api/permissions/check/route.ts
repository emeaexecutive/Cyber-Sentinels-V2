import { NextResponse } from "next/server";
import {
  evaluatePermissionsFirewall,
  permissionAuditEvents,
  permissionSignals,
  type PermissionSubjectType,
} from "@/lib/trust-engine/permissionsFirewall";
import {
  agentRiskLevels,
  permissionScopes,
  type AgentPermissionScope,
} from "@/lib/trust-engine/agentRegistry";

const subjectTypes = ["human", "agent", "api_key", "system"] as const;
const realityDriftLevels = ["low", "medium", "high", "critical"] as const;

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

function getOptionalText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 160) {
    throw new Error("Invalid input");
  }

  return value;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid permission request" },
        { status: 400 }
      );
    }

    const requestedAction = getAllowed(
      body,
      "requested_action",
      permissionScopes
    ) as AgentPermissionScope;
    const permissionScope = getAllowed(
      body,
      "permission_scope",
      permissionScopes,
      requestedAction
    ) as AgentPermissionScope;
    const subjectType = getAllowed(
      body,
      "subject_type",
      subjectTypes,
      "system"
    ) as PermissionSubjectType;
    const riskLevel = getAllowed(body, "risk_level", agentRiskLevels, "medium");
    const result = evaluatePermissionsFirewall({
      subject_type: subjectType,
      subject_id: getOptionalText(body, "subject_id"),
      requested_action: requestedAction,
      permission_scope: permissionScope,
      risk_level: riskLevel,
      policy_status: getOptionalText(body, "policy_status") ?? "approved",
      evidence_status: getOptionalText(body, "evidence_status") ?? "complete",
      admin_approval_status:
        getOptionalText(body, "admin_approval_status") ?? "approved",
      reality_drift: getAllowed(body, "reality_drift", realityDriftLevels, "low"),
      trust_score:
        typeof body.trust_score === "number" ? body.trust_score : 90,
      human_presence_index:
        typeof body.human_presence_index === "number"
          ? body.human_presence_index
          : null,
      origin_trace_score:
        typeof body.origin_trace_score === "number"
          ? body.origin_trace_score
          : null,
    });

    return NextResponse.json({
      ok: true,
      decision: result.decision,
      reason_codes: result.reason_codes,
      recommended_next_step: result.recommended_next_step,
      signals: permissionSignals,
      audit_events: permissionAuditEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid permission request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not evaluate permission" },
      { status: 500 }
    );
  }
}
