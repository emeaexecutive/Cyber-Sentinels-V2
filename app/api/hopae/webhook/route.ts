import { NextResponse } from "next/server";
import {
  getHopaeConfig,
  getHopaeWebhookTimestamp,
  verifyHopaeWebhookSignature,
  type HopaeJson,
} from "@/lib/hopae";
import { getHopaeVerificationId, textValue, unwrapHopaePayload } from "@/lib/hopae-normalize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const maxSignatureAgeSeconds = 5 * 60;

export async function POST(req: Request) {
  const config = getHopaeConfig();
  if (!config.enabled) {
    return NextResponse.json({ ok: false, enabled: false, error: "Hopae Connect is disabled." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hopae-signature") ?? "";
  const timestamp = getHopaeWebhookTimestamp(signatureHeader);
  if (!config.webhookSecret || timestamp === null) {
    return NextResponse.json({ ok: false, error: "Missing or invalid signature." }, { status: 401 });
  }
  const timestampSeconds = timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > maxSignatureAgeSeconds) {
    return NextResponse.json({ ok: false, error: "Signature timestamp is outside the allowed window." }, { status: 401 });
  }
  if (!verifyHopaeWebhookSignature(rawBody, signatureHeader, config.webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let event: HopaeJson;
  try { event = JSON.parse(rawBody) as HopaeJson; } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const data = unwrapHopaePayload(event);
  const verificationId = getHopaeVerificationId(data);
  const eventId = textValue(event.id, event.eventId, event.event_id);
  const eventType = textValue(event.type, event.eventType, event.event_type);
  const status = textValue(data.status, data.verificationStatus);
  const admin = createServiceRoleClient();
  const { error: eventError } = await admin.from("hopae_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    verification_id: verificationId,
    signature_timestamp: timestampSeconds,
    raw_event: event,
    processed_at: new Date().toISOString(),
  });
  if (eventError) {
    if (eventError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("Hopae webhook event storage failed.", { code: eventError.code });
    return NextResponse.json({ ok: false, error: "Could not store webhook event." }, { status: 500 });
  }

  let ownerUserId: string | null = null;
  if (verificationId) {
    const { data: local } = await admin
      .from("hopae_verifications")
      .select("owner_user_id")
      .eq("verification_id", verificationId)
      .maybeSingle<{ owner_user_id: string }>();
    ownerUserId = local?.owner_user_id ?? null;
    await admin.from("hopae_verifications").update({
      ...(status ? { status } : {}),
      ...(status && ["completed", "verified", "success", "succeeded"].includes(status.toLowerCase())
        ? { completed_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    }).eq("verification_id", verificationId);
  }

  await admin.from("trust_events").insert({
    actor_type: "provider",
    actor_label: "Hopae Connect",
    event_type: "hopae_webhook_received",
    event_source: "hopae.connect.webhook",
    risk_level: "low",
    metadata: {
      owner_user_id: ownerUserId,
      verification_id: verificationId,
      hopae_event_id: eventId,
      hopae_event_type: eventType,
      status,
      upstream_identity_proof: true,
    },
  });

  return NextResponse.json({ ok: true });
}
