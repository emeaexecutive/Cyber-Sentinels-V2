import { getJudgeMePrivateConfig } from "@/lib/env";
import { checkRequestRateLimit } from "@/lib/security";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { completeWebhookEvent, reserveWebhookEvent } from "@/lib/webhooks/event-ledger";
import { createJudgeMeWebhookHandler, type JudgeMeInstallation } from "@/lib/providers/judgeme-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eventTypes: Record<string, string> = {
  "review-created": "review/created",
  "review-updated": "review/updated",
  "review-created-fail": "review/created_fail",
};

async function fetchReview(installation: JudgeMeInstallation, reviewId: string, token: string) {
  const url = new URL(`https://api.judge.me/api/v1/reviews/${encodeURIComponent(reviewId)}`);
  url.searchParams.set("shop_domain", installation.shopDomain);
  const response = await fetch(url, { headers: { accept: "application/json", "X-Api-Token": token }, redirect: "error", signal: AbortSignal.timeout(8_000) });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 65_536) throw new Error("JUDGEME_REVIEW_FETCH_FAILED");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 65_536) throw new Error("JUDGEME_REVIEW_RESPONSE_TOO_LARGE");
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("JUDGEME_REVIEW_RESPONSE_INVALID"); }
}

export async function POST(request: Request, context: { params: Promise<{ installationId: string; event: string }> }) {
  const limited = checkRequestRateLimit({ route: "judgeme-webhook", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const { installationId, event } = await context.params;
  const eventType = eventTypes[event];
  if (!eventType) return Response.json({ error: "Unsupported webhook" }, { status: 404 });
  try {
    const config = getJudgeMePrivateConfig("Judge.me webhook");
    const database = createServiceRoleClient();
    return createJudgeMeWebhookHandler(eventType, {
      privateToken: () => config.privateApiToken,
      async loadInstallation(id) {
        const result = await database.from("judgeme_installations").select("id,enterprise_id,shop_domain,status").eq("id", id).maybeSingle();
        if (result.error || !result.data || result.data.status !== "active") return null;
        return { id: result.data.id, enterpriseId: result.data.enterprise_id, shopDomain: result.data.shop_domain, serviceSubjectId: result.data.id, status: "active" };
      },
      reserve: (input) => reserveWebhookEvent(input),
      complete: completeWebhookEvent,
      fetchReview: (installation, reviewId) => fetchReview(installation, reviewId, config.privateApiToken),
      async persistEvidence({ installation, evidence, cryptographicallyVerified, serverVerified, eventId, ledgerReference }) {
        const database = createServiceRoleClient();
        const reasons = [...evidence.reasonCodes, "JUDGEME_WEBHOOK_HMAC_SHA256_VERIFIED", ...(serverVerified ? ["JUDGEME_CURRENT_REVIEW_FETCHED"] : ["JUDGEME_WEBHOOK_ONLY"])];
        const row = {
          evidence_id: evidence.evidenceId,
          enterprise_id: installation.enterpriseId,
          provider_key: "judgeme",
          evidence_classification: "AUTHENTICATED_PROVIDER_OBSERVATION",
          storage_boundary: "NORMALIZED_LEDGER",
          normalized_facts: evidence.normalizedFacts,
          occurred_at: evidence.occurredAt,
          retention_expires_at: evidence.expiresAt,
          domain_key: "DATA",
          subject_id: installation.id,
          subject_type: "SERVICE",
          evidence_type: evidence.evidenceType,
          source_type: "PROVIDER",
          source_key: "judgeme",
          result: "INCONCLUSIVE",
          assurance_level: serverVerified ? "MEDIUM" : "LOW",
          cryptographically_verified: cryptographicallyVerified,
          server_verified: serverVerified,
          received_at: evidence.receivedAt,
          expires_at: evidence.expiresAt,
          payload_hash: evidence.payloadHash,
          canonicalization: "JCS",
          hash_algorithm: "SHA-256",
          reason_codes: reasons,
        };
        const stored = await database.from("evidence_objects").upsert(row, { onConflict: "evidence_id", ignoreDuplicates: true });
        if (stored.error) throw new Error("JUDGEME_EVIDENCE_PERSIST_FAILED");
        const memory = await database.from("trust_memory_index").upsert({
          enterprise_id: installation.enterpriseId,
          subject_id: installation.id,
          domain_key: "DATA",
          memory_type: "PROVIDER_OBSERVATION",
          source_id: evidence.evidenceId,
          occurred_at: evidence.occurredAt,
          summary: {
            provider: "judgeme",
            providerEventId: eventId,
            providerProvenance: "RAW_BODY_HMAC_AND_CURRENT_API_FETCH",
            evidenceType: evidence.evidenceType,
            evidenceDigest: evidence.payloadHash,
            claim: "PROVIDER_ASSERTED_UNQUALIFIED",
            outcome: "INCONCLUSIVE",
            corroboration: "NOT_ESTABLISHED",
            contradiction: "NOT_ASSESSED",
            identityContinuity: "NOT_ESTABLISHED",
            authorityGranted: false,
            actionAuthorized: false,
            rawReviewContentRetained: false,
          },
        }, { onConflict: "enterprise_id,memory_type,source_id", ignoreDuplicates: true });
        if (memory.error) throw new Error("JUDGEME_TRUST_MEMORY_PERSIST_FAILED");
        return {
          evidenceReference: `evidence:${evidence.evidenceId}`,
          receiptReference: `webhook-event-ledger:${ledgerReference}`,
          replayReference: `webhook-event-ledger:${ledgerReference}`,
          trustMemoryReference: `trust-memory-index:${installation.enterpriseId}:${evidence.evidenceId}`,
        };
      },
    })(request, installationId);
  } catch {
    return Response.json({ error: "Webhook unavailable" }, { status: 503 });
  }
}