import { createHash } from "node:crypto";
import { createJudgeMeReferenceAdapter, JUDGEME_EVENTS, verifyJudgeMeWebhookSignature, type JudgeMeReviewBinding } from "./judgeme.ts";

const maximumBodyBytes = 262_144;
const events = new Set<string>(JUDGEME_EVENTS);

export type JudgeMeInstallation = {
  id: string;
  enterpriseId: string;
  shopDomain: string;
  serviceSubjectId: string;
  status: "active";
};

type JudgeMeReview = {
  id: string | null;
  product_external_id: string;
  rating?: number;
  verified?: string;
  curated?: string;
  hidden?: boolean;
  updated_at?: string;
  created_at?: string;
};

export type JudgeMeWebhookDependencies = {
  privateToken: () => string;
  loadInstallation: (installationId: string) => Promise<JudgeMeInstallation | null>;
  reserve: (input: { provider: string; eventId: string; eventType: string; rawBody: string; tenantId: string }) => Promise<{ reserved: boolean; id?: string; duplicateOf?: string | null; status?: string }>;
  complete: (provider: string, eventId: string, status: "processed" | "failed", errorCategory?: string) => Promise<void>;
  fetchReview: (installation: JudgeMeInstallation, reviewId: string) => Promise<unknown>;
  persistEvidence: (input: { installation: JudgeMeInstallation; evidence: Awaited<ReturnType<ReturnType<typeof createJudgeMeReferenceAdapter>["mapEvidence"]>>; cryptographicallyVerified: true; serverVerified: boolean; eventId: string; ledgerReference: string }) => Promise<{ evidenceReference: string; receiptReference: string; replayReference: string; trustMemoryReference: string }>;
  now?: () => Date;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function shopDomain(value: unknown) {
  if (typeof value !== "string" || value.length > 253) return null;
  const normalized = value.trim().toLowerCase();
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized) ? normalized : null;
}

function identifier(value: unknown) {
  const normalized = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : typeof value === "string" ? value : "";
  return /^[1-9][0-9]{0,39}$/.test(normalized) ? normalized : null;
}

function safeReview(value: Record<string, unknown>): JudgeMeReview | null {
  const productId = identifier(value.product_external_id);
  const reviewId = value.id === null || value.id === undefined ? null : identifier(value.id);
  if (!productId || (value.id !== null && value.id !== undefined && !reviewId)) return null;
  const review: JudgeMeReview = { id: reviewId, product_external_id: productId };
  if (value.rating !== undefined) review.rating = value.rating as number;
  if (value.verified !== undefined) review.verified = value.verified as string;
  if (value.curated !== undefined) review.curated = value.curated as string;
  if (value.hidden !== undefined) review.hidden = value.hidden as boolean;
  if (typeof value.updated_at === "string") review.updated_at = value.updated_at;
  if (typeof value.created_at === "string") review.created_at = value.created_at;
  return review;
}

function eventDigest(installationId: string, rawBody: Uint8Array) {
  return createHash("sha256").update(installationId).update(":").update(rawBody).digest("hex");
}

function evidenceTime(review: JudgeMeReview, eventType: string) {
  const value = eventType === "review/created_fail" ? review.created_at ?? review.updated_at : review.updated_at ?? review.created_at;
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function createJudgeMeWebhookHandler(eventType: string, deps: JudgeMeWebhookDependencies) {
  if (!events.has(eventType)) throw new TypeError("JUDGEME_EVENT_UNSUPPORTED");
  return async function POST(request: Request, installationId: string) {
    const signature = request.headers.get("judgeme-hmac-sha256") ?? request.headers.get("x-judgeme-hmac-sha256");
    if (!signature) return Response.json({ error: "Invalid webhook" }, { status: 401 });
    let secret: string;
    try { secret = deps.privateToken().trim(); }
    catch { return Response.json({ error: "Webhook unavailable" }, { status: 503 }); }
    if (!secret) return Response.json({ error: "Webhook unavailable" }, { status: 503 });

    let rawBody: Uint8Array;
    try {
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > maximumBodyBytes) return Response.json({ error: "Payload too large" }, { status: 413 });
      rawBody = new Uint8Array(await request.arrayBuffer());
    } catch { return Response.json({ error: "Invalid webhook" }, { status: 400 }); }
    if (rawBody.byteLength > maximumBodyBytes) return Response.json({ error: "Payload too large" }, { status: 413 });
    if (!verifyJudgeMeWebhookSignature(rawBody, signature, secret)) return Response.json({ error: "Invalid webhook" }, { status: 401 });

    let payload: Record<string, unknown> | null;
    try { payload = object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody))); }
    catch { payload = null; }
    if (!payload) return Response.json({ error: "Invalid webhook" }, { status: 400 });
    const nestedReview = object(payload.review);
    const sourceReview = nestedReview ?? payload;
    const installation = await deps.loadInstallation(installationId).catch(() => null);
    if (!installation || installation.status !== "active" || installation.id !== installationId) return Response.json({ error: "Installation unavailable" }, { status: 404 });
    const payloadShop = shopDomain(payload.shop_domain ?? nestedReview?.shop_domain);
    if (payloadShop && payloadShop !== installation.shopDomain) return Response.json({ error: "Installation mismatch" }, { status: 403 });

    const safePayloadReview = safeReview(sourceReview);
    if (!safePayloadReview || (eventType === "review/created_fail") !== (safePayloadReview.id === null)) return Response.json({ error: "Invalid webhook" }, { status: 400 });
    const payloadEventType = payload.event_type ?? payload.eventType ?? payload.key;
    if (typeof payloadEventType === "string" && payloadEventType !== eventType) return Response.json({ error: "Event mismatch" }, { status: 400 });

    const eventId = `jd:${eventDigest(installation.id, rawBody)}`;
    let reserved = false;
    try {
      const intake = await deps.reserve({ provider: "judgeme", eventId, eventType, rawBody: new TextDecoder().decode(rawBody), tenantId: installation.enterpriseId });
      if (!intake.reserved) {
        if (intake.status === "processed" || intake.status === "duplicate") {
          const replayReference = `webhook-event-ledger:${intake.duplicateOf ?? eventId}`;
          return Response.json({ received: true, duplicate: true, receiptReference: replayReference, replayReference });
        }
        if (intake.status === "payload_mismatch") return Response.json({ error: "Event collision" }, { status: 409 });
        return Response.json({ error: "Webhook retry required" }, { status: 503 });
      }
      reserved = true;

      let review = safePayloadReview;
      let serverVerified = false;
      if (eventType !== "review/created_fail") {
        const authoritative = object(await deps.fetchReview(installation, safePayloadReview.id!));
        const current = object(authoritative?.review) ?? authoritative;
        const safeCurrent = current ? safeReview(current) : null;
        if (!safeCurrent || safeCurrent.id !== safePayloadReview.id || safeCurrent.product_external_id !== safePayloadReview.product_external_id) throw new Error("JUDGEME_REVIEW_BINDING_MISMATCH");
        review = safeCurrent;
        serverVerified = true;
      }

      const receivedAt = (deps.now?.() ?? new Date()).toISOString();
      const occurredAt = evidenceTime(review, eventType) ?? (eventType === "review/created_fail" ? receivedAt : null);
      if (!occurredAt) throw new Error("JUDGEME_TIMESTAMP_INVALID");
      const age = Date.parse(receivedAt) - Date.parse(occurredAt);
      if (age < 0 || age >= 86_400_000) {
        await deps.complete("judgeme", eventId, "processed");
        return Response.json({ received: true, stale: true, evidenceRecorded: false }, { status: 200 });
      }
      const binding: JudgeMeReviewBinding = {
        tenantId: installation.enterpriseId,
        installationId: installation.id,
        shopDomain: installation.shopDomain,
        subject: { type: "SERVICE", id: installation.serviceSubjectId },
        productExternalId: review.product_external_id,
        reviewReference: `judgeme:${installation.shopDomain}:${review.id ?? eventId}`,
        providerReviewId: review.id,
      };
      const adapter = createJudgeMeReferenceAdapter(binding);
      const evidence = await adapter.mapEvidence({
        providerKey: "judgeme",
        eventId,
        subject: binding.subject,
        evidenceType: "JUDGEME_REVIEW_OBSERVATION",
        finding: "OBSERVED",
        occurredAt,
        evidence: {
          tenantId: installation.enterpriseId,
          installationId: installation.id,
          shopDomain: installation.shopDomain,
          reviewReference: binding.reviewReference,
          eventType,
          review: {
            id: review.id,
            product_external_id: review.product_external_id,
            ...(review.rating !== undefined ? { rating: review.rating } : {}),
            ...(review.verified !== undefined ? { verified: review.verified } : {}),
            ...(review.curated !== undefined ? { curated: review.curated } : {}),
            ...(review.hidden !== undefined ? { hidden: review.hidden } : {}),
          },
        },
      }, receivedAt);
      const references = await deps.persistEvidence({ installation, evidence, cryptographicallyVerified: true, serverVerified, eventId, ledgerReference: intake.id ?? eventId });
      await deps.complete("judgeme", eventId, "processed");
      return Response.json({ received: true, evidenceRecorded: true, ...references }, { status: 201 });
    } catch {
      if (reserved) await deps.complete("judgeme", eventId, "failed", "judgeme_processing_failed").catch(() => undefined);
      return Response.json({ error: "Webhook processing failed" }, { status: 503 });
    }
  };
}