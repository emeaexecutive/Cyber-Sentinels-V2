import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { governanceEngine } from "@/lib/core/governance-engine";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import {
  POLICY_ENGINE_BOUNDARY,
  type PolicyEvaluationInput,
} from "@/lib/policy-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function evaluationInput(value: unknown): PolicyEvaluationInput {
  const input = objectValue(value);
  return {
    workflowId: String(input.workflowId ?? "policy-api-preview"),
    workflowType: ["candidate", "executive", "session", "high_assurance", "general"].includes(
      String(input.workflowType)
    )
      ? (String(input.workflowType) as PolicyEvaluationInput["workflowType"])
      : "general",
    trustScore: numberValue(input.trustScore, 65),
    providerConfidence: numberValue(input.providerConfidence, 65),
    sessionIntegrity: numberValue(input.sessionIntegrity, 65),
    daysSinceLastEvidence: numberValue(input.daysSinceLastEvidence, 0),
    anomalyCount: numberValue(input.anomalyCount, 0),
    evidenceReferences: Array.isArray(input.evidenceReferences)
      ? input.evidenceReferences.map(String).slice(0, 20)
      : [],
  };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;

  return NextResponse.json({
    ok: true,
    policies: governanceEngine.listGovernancePolicies(),
    boundary: POLICY_ENGINE_BOUNDARY,
    persistence: "templates_and_preview_only",
    humanReviewRemainsAuthoritative: true,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;
  const body = objectValue(await req.json().catch(() => ({})));
  const policyId = String(body.policyId ?? "");
  const policy = governanceEngine.listGovernancePolicies().find((item) => item.id === policyId);
  if (!policy) {
    return NextResponse.json(
      { ok: false, error: "known_policy_id_required" },
      { status: 400 }
    );
  }
  const result = governanceEngine.evaluateGovernancePolicy(policy, evaluationInput(body.input));
  await createAuditLog(
    supabase,
    result.auditContext.eventType,
    access.user.email ?? access.user.id,
    {
      workflow_id: result.workflowId,
      policy_id: result.policyId,
      policy_name: result.policyName,
      policy_route: result.route,
      policy_triggers: result.triggers.map((trigger) => ({
        code: trigger.code,
        threshold: trigger.threshold,
        observed: trigger.observed,
      })),
      replay_context: result.replayContext,
      human_review_required: true,
      automatic_punitive_decision: false,
    }
  );

  return NextResponse.json({ ok: true, evaluation: result });
}
