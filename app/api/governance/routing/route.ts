import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { governanceEngine } from "@/lib/core/governance-engine";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { type PolicyEvaluationInput } from "@/lib/policy-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function bodyObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boundedNumber(value: unknown, fallback: number, minimum = 0, maximum = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;

  return NextResponse.json({
    ok: true,
    routes: governanceEngine.listGovernancePolicies().map((policy) => ({
      policyId: policy.id,
      policyName: policy.name,
      workflowType: policy.workflowType,
      reviewerQueue: policy.reviewerQueue,
      assignedReviewer: policy.assignedReviewer,
      assuranceLevel: policy.assuranceLevel,
      humanReviewRequired: true,
    })),
    governanceContinuity: "replay_linked",
    automaticAccusation: false,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;
  const body = bodyObject(await req.json().catch(() => ({})));
  const policy = governanceEngine.listGovernancePolicies().find(
    (item) => item.id === String(body.policyId ?? "")
  );
  if (!policy) {
    return NextResponse.json(
      { ok: false, error: "known_policy_id_required" },
      { status: 400 }
    );
  }
  const source = bodyObject(body.input);
  const input: PolicyEvaluationInput = {
    workflowId: String(source.workflowId ?? "governance-routing-preview"),
    workflowType: policy.workflowType,
    trustScore: boundedNumber(source.trustScore, 65),
    providerConfidence: boundedNumber(source.providerConfidence, 65),
    sessionIntegrity: boundedNumber(source.sessionIntegrity, 65),
    daysSinceLastEvidence: boundedNumber(source.daysSinceLastEvidence, 0, 0, 3650),
    anomalyCount: boundedNumber(source.anomalyCount, 0, 0, 1000),
    evidenceReferences: Array.isArray(source.evidenceReferences)
      ? source.evidenceReferences.map(String).slice(0, 20)
      : [],
  };
  const result = governanceEngine.evaluateGovernancePolicy(policy, input);
  await createAuditLog(
    supabase,
    "governance_routing_evaluated",
    access.user.email ?? access.user.id,
    {
      workflow_id: result.workflowId,
      policy_id: result.policyId,
      reviewer_queue: result.governanceRouting.reviewerQueue,
      assigned_reviewer: result.governanceRouting.assignedReviewer,
      policy_route: result.route,
      replay_context: result.replayContext,
      human_review_required: true,
    }
  );

  return NextResponse.json({
    ok: true,
    governanceRouting: result.governanceRouting,
    triggers: result.triggers,
    explanation: result.explanation,
    replayContext: result.replayContext,
    automaticPunitiveDecision: false,
  });
}
