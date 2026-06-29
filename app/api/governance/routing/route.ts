import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import {
  defaultTrustPolicies,
  evaluateTrustPolicy,
  type PolicyEvaluationInput,
} from "@/lib/policy-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function bodyObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;

  return NextResponse.json({
    ok: true,
    routes: defaultTrustPolicies.map((policy) => ({
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
  const policy = defaultTrustPolicies.find(
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
    trustScore: Number(source.trustScore ?? 65),
    providerConfidence: Number(source.providerConfidence ?? 65),
    sessionIntegrity: Number(source.sessionIntegrity ?? 65),
    daysSinceLastEvidence: Number(source.daysSinceLastEvidence ?? 0),
    anomalyCount: Number(source.anomalyCount ?? 0),
    evidenceReferences: Array.isArray(source.evidenceReferences)
      ? source.evidenceReferences.map(String).slice(0, 20)
      : [],
  };
  const result = evaluateTrustPolicy(policy, input);
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
