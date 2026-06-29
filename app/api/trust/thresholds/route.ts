import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import {
  defaultTrustPolicies,
  validateTrustPolicy,
  type TrustPolicy,
} from "@/lib/policy-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boundedThreshold(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(100, Math.round(parsed)))
    : fallback;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;

  return NextResponse.json({
    ok: true,
    thresholds: defaultTrustPolicies.map((policy) => ({
      policyId: policy.id,
      escalationThreshold: policy.escalationThreshold,
      highAssuranceThreshold: policy.highAssuranceThreshold,
      providerConfidenceMinimum: policy.providerConfidenceMinimum,
      sessionIntegrityMinimum: policy.sessionIntegrityMinimum,
      trustDecayDays: policy.trustDecayDays,
    })),
    explainable: true,
    humanReviewRequired: true,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);
  if (!access.ok) return access.response;
  const body = objectValue(await req.json().catch(() => ({})));
  const policy = defaultTrustPolicies.find(
    (item) => item.id === String(body.policyId ?? "")
  );
  if (!policy) {
    return NextResponse.json(
      { ok: false, error: "known_policy_id_required" },
      { status: 400 }
    );
  }
  const draft = objectValue(body.thresholds);
  const preview: TrustPolicy = {
    ...policy,
    escalationThreshold: boundedThreshold(
      draft.escalationThreshold,
      policy.escalationThreshold
    ),
    highAssuranceThreshold: boundedThreshold(
      draft.highAssuranceThreshold,
      policy.highAssuranceThreshold
    ),
    providerConfidenceMinimum: boundedThreshold(
      draft.providerConfidenceMinimum,
      policy.providerConfidenceMinimum
    ),
    sessionIntegrityMinimum: boundedThreshold(
      draft.sessionIntegrityMinimum,
      policy.sessionIntegrityMinimum
    ),
    trustDecayDays: Math.max(
      1,
      Math.round(Number(draft.trustDecayDays ?? policy.trustDecayDays))
    ),
  };
  const validation = validateTrustPolicy(preview);

  return NextResponse.json({
    ok: validation.valid,
    policyId: policy.id,
    thresholdPreview: {
      escalationThreshold: preview.escalationThreshold,
      highAssuranceThreshold: preview.highAssuranceThreshold,
      providerConfidenceMinimum: preview.providerConfidenceMinimum,
      sessionIntegrityMinimum: preview.sessionIntegrityMinimum,
      trustDecayDays: preview.trustDecayDays,
    },
    errors: validation.errors,
    persistence: "preview_only",
    publishingRequires: "approved_storage_and_rls_policy",
    humanReviewRequired: true,
  }, { status: validation.valid ? 200 : 400 });
}
