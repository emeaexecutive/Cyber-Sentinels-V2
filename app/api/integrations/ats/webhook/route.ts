import { NextResponse } from "next/server";
import { checkRequestRateLimit } from "@/lib/bot-protection";
import {
  atsEventTypes,
  getATSProvider,
  getATSProviderSecret,
  type ATSEventType,
  type ATSProviderId,
} from "@/lib/integrations/ats";
import { verifyATSWebhookSignature } from "@/lib/integrations/ats/security";
import { processATSWebhookEvent } from "@/lib/integrations/ats/workflow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
const maxWebhookBytes = 1_000_000;

export async function POST(request: Request) {
  const rateLimited = checkRequestRateLimit(
    request,
    "/api/integrations/ats/webhook",
    120,
    60_000
  );
  if (rateLimited) return rateLimited;
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxWebhookBytes) {
    return NextResponse.json(
      { error: "ATS webhook payload is too large." },
      { status: 413 }
    );
  }

  const suppliedProvider = (
    request.headers.get("x-ats-provider") ?? ""
  ).trim().toLowerCase();
  const providerId = suppliedProvider as ATSProviderId;
  const provider = getATSProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unsupported ATS provider." }, { status: 400 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxWebhookBytes) {
    return NextResponse.json(
      { error: "ATS webhook payload is too large." },
      { status: 413 }
    );
  }
  const signature = request.headers.get("x-cyber-sentinels-signature") ?? "";
  const secret = getATSProviderSecret(providerId);
  if (!secret) {
    return NextResponse.json(
      { error: "ATS webhook is not configured for this provider." },
      { status: 503 }
    );
  }
  if (!verifyATSWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid ATS webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "ATS webhook body must be valid JSON." }, { status: 400 });
  }

  const body =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const eventType = String(
    request.headers.get("x-ats-event") ??
      body.eventType ??
      body.event_type ??
      body.type ??
      ""
  ) as ATSEventType;
  if (!atsEventTypes.includes(eventType)) {
    return NextResponse.json({ error: "Unsupported ATS event type." }, { status: 400 });
  }

  try {
    const event = provider.normalizeWebhook(payload, eventType);
    const result = await processATSWebhookEvent(
      createServiceRoleClient(),
      event
    );
    return NextResponse.json(
      { schemaVersion: 1, generatedAt: new Date().toISOString(), data: result },
      { status: result.duplicate ? 200 : 202 }
    );
  } catch (error) {
    console.error("ATS webhook processing failed.", error);
    return NextResponse.json(
      { error: "ATS webhook could not be processed safely." },
      { status: 422 }
    );
  }
}
