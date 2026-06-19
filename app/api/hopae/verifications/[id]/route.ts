import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import {
  HopaeDisabledError,
  type HopaeJson,
} from "@/lib/hopae";
import { hopaeIdentityProvider } from "@/lib/identity-providers/hopae-provider";
import { normalizeHopaeResult } from "@/lib/hopae-normalize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

type LocalVerification = {
  verification_id: string;
  owner_user_id: string;
  owner_email: string | null;
  match_data: HopaeJson | null;
};

async function updateLinkedTrustRecord(
  admin: ReturnType<typeof createServiceRoleClient>,
  table: "passports" | "trust_reports",
  id: string,
  ownerEmail: string | null,
  proof: HopaeJson,
  uplift: number
) {
  if (!ownerEmail) return;
  const { data } = await admin
    .from(table)
    .select("id, identity_assurance_score, upstream_identity_proofs")
    .eq("id", id)
    .eq("owner_email", ownerEmail)
    .maybeSingle<{
      id: string;
      identity_assurance_score: number | null;
      upstream_identity_proofs: HopaeJson[] | null;
    }>();
  if (!data) return;

  const existingProofs = Array.isArray(data.upstream_identity_proofs)
    ? data.upstream_identity_proofs
    : [];
  const withoutCurrent = existingProofs.filter(
    (item) => item.verification_id !== proof.verification_id
  );
  await admin.from(table).update({
    identity_assurance_score: Math.max(data.identity_assurance_score ?? 0, uplift),
    upstream_identity_proofs: [...withoutCurrent, proof],
  }).eq("id", id);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hopaeIdentityProvider.isEnabled()) {
      return NextResponse.json(
        { ok: false, enabled: false, error: "Hopae Connect is disabled." },
        { status: 503 }
      );
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing verification ID." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    const { data: local } = await admin
      .from("hopae_verifications")
      .select("verification_id, owner_user_id, owner_email, match_data")
      .eq("verification_id", id)
      .maybeSingle<LocalVerification>();
    if (!local) return NextResponse.json({ ok: false, error: "Verification not found." }, { status: 404 });
    if (local.owner_user_id !== user.id && !isAdminAllowlisted(user.email)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const hopaeStatus = await hopaeIdentityProvider.getVerificationStatus(id);
    const statusOnly = normalizeHopaeResult(hopaeStatus);
    const userInfo = statusOnly.completed
      ? await hopaeIdentityProvider.getVerificationUserInfo(id)
      : {};
    const normalized = normalizeHopaeResult(hopaeStatus, userInfo);
    const update = {
      status: normalized.status,
      provider_id: normalized.providerId,
      flow_type: normalized.flowType,
      flow_details: normalized.flowDetails,
      expires_at: normalized.expiresAt,
      completed_at: normalized.completedAt,
      normalized_user_data: normalized.completed ? normalized.normalizedUserData : null,
      provenance: normalized.completed ? normalized.provenance : null,
      verification_model: normalized.verificationModel,
      hopae_loa: normalized.hopaeLoa,
      acr: normalized.acr,
      amr: normalized.amr,
      identity_assurance_uplift: normalized.uplift,
      provenance_confidence: normalized.provenanceConfidence,
      upstream_identity_proof: normalized.upstreamIdentityProof,
      updated_at: new Date().toISOString(),
    };
    await admin.from("hopae_verifications").update(update).eq("verification_id", id);

    if (normalized.completed) {
      const proof = {
        ...normalized.upstreamIdentityProof,
        verification_id: id,
        verification_model: normalized.verificationModel,
        provenance_confidence: normalized.provenanceConfidence,
        completed_at: normalized.completedAt,
      };
      const passportId = typeof local.match_data?.passportId === "string" ? local.match_data.passportId : null;
      const reportId = typeof local.match_data?.trustReportId === "string" ? local.match_data.trustReportId : null;
      if (passportId) {
        await updateLinkedTrustRecord(admin, "passports", passportId, local.owner_email, proof, normalized.uplift);
      }
      if (reportId) {
        await updateLinkedTrustRecord(admin, "trust_reports", reportId, local.owner_email, proof, normalized.uplift);
      }
    }

    await admin.from("trust_events").insert({
      actor_type: "provider",
      actor_label: "Hopae Connect",
      event_type: normalized.completed ? "hopae_verification_completed" : "hopae_verification_status_checked",
      event_source: "hopae.connect",
      risk_level: "low",
      metadata: {
        owner_user_id: local.owner_user_id,
        verification_id: id,
        provider_id: normalized.providerId,
        status: normalized.status,
        identity_assurance_uplift: normalized.uplift,
        provenance_confidence: normalized.provenanceConfidence,
        final_trust_decision: "manual_review",
      },
    });

    return NextResponse.json({ ok: true, local: { ...local, ...update }, hopae: hopaeStatus });
  } catch (error) {
    console.error("Hopae verification status failed.", error);
    const disabled = error instanceof HopaeDisabledError;
    return NextResponse.json(
      { ok: false, error: disabled ? error.message : "Could not retrieve Hopae verification." },
      { status: disabled ? 503 : 502 }
    );
  }
}
