import { NextResponse } from "next/server";
import {
  HopaeDisabledError,
  type HopaeJson,
} from "@/lib/hopae";
import { hopaeIdentityProvider } from "@/lib/identity-providers/hopae-provider";
import { getHopaeVerificationId, normalizeHopaeResult } from "@/lib/hopae-normalize";
import { createClient } from "@/lib/supabase/server";

function isJsonObject(value: unknown): value is HopaeJson {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(req: Request) {
  try {
    if (!hopaeIdentityProvider.isEnabled()) {
      return NextResponse.json(
        { ok: false, enabled: false, error: "Hopae Connect is disabled." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as HopaeJson | null;
    const providerId = typeof body?.providerId === "string" ? body.providerId.trim() : "";
    const redirectUri = typeof body?.redirectUri === "string" ? body.redirectUri.trim() : "";
    const matchData = isJsonObject(body?.matchData) ? body.matchData : {};
    if (!providerId || !redirectUri) {
      return NextResponse.json(
        { ok: false, error: "providerId and redirectUri are required." },
        { status: 400 }
      );
    }

    const allowedRedirectOrigin = new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ).origin;
    let redirectOrigin = "";
    try { redirectOrigin = new URL(redirectUri).origin; } catch { /* handled below */ }
    if (redirectOrigin !== allowedRedirectOrigin) {
      return NextResponse.json({ ok: false, error: "redirectUri is not allowed." }, { status: 400 });
    }

    const hopae = await hopaeIdentityProvider.createVerification({
      providerId,
      redirectUri,
      matchData,
      metadata: { ownerUserId: user.id, source: "cyber-sentinels" },
    });
    const verificationId = getHopaeVerificationId(hopae);
    if (!verificationId) throw new Error("Hopae response did not include a verification ID.");
    const normalized = normalizeHopaeResult(hopae);

    const { error } = await supabase.from("hopae_verifications").insert({
      verification_id: verificationId,
      owner_user_id: user.id,
      owner_email: user.email ?? null,
      status: normalized.status,
      provider_id: normalized.providerId ?? providerId,
      flow_type: normalized.flowType,
      flow_details: normalized.flowDetails,
      redirect_uri: redirectUri,
      match_data: matchData,
      expires_at: normalized.expiresAt,
      upstream_identity_proof: normalized.upstreamIdentityProof,
    });
    if (error) throw new Error("Could not store Hopae verification.");

    await supabase.from("trust_events").insert({
      actor_type: "user",
      actor_id: user.id,
      actor_label: user.email ?? user.id,
      event_type: "hopae_verification_created",
      event_source: "hopae.connect",
      risk_level: "low",
      metadata: {
        owner_user_id: user.id,
        verification_id: verificationId,
        provider_id: providerId,
        upstream_identity_proof: true,
      },
    });

    return NextResponse.json({
      ok: true,
      verificationId,
      status: normalized.status,
      providerId: normalized.providerId ?? providerId,
      flowType: normalized.flowType,
      flowDetails: normalized.flowDetails,
      expiresAt: normalized.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Hopae verification creation failed.", error);
    const disabled = error instanceof HopaeDisabledError;
    return NextResponse.json(
      { ok: false, error: disabled ? error.message : "Could not create Hopae verification." },
      { status: disabled ? 503 : 502 }
    );
  }
}
