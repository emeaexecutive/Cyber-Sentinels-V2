import { consentCorrelationId, consentFailure, consentResponse, resolveConsentContext } from "@/src/lib/consent/http";
import { consentRepository } from "@/src/lib/consent/repository";

export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function decodeCursor(value: string | null) { if (!value) return undefined; try { const parsed = JSON.parse(Buffer.from(value,"base64url").toString("utf8")); if(!Array.isArray(parsed)||parsed.length!==2||typeof parsed[0]!=="string"||!uuidPattern.test(parsed[1])) throw new Error("shape"); return { occurredAt:new Date(parsed[0]).toISOString(),receiptId:String(parsed[1]) }; } catch { throw Object.assign(new Error("Consent history cursor is invalid."),{status:400,code:"CONSENT_CURSOR_INVALID"}); } }
export async function GET(request: Request) {
  const correlationId = consentCorrelationId(request);
  try {
    const context = await resolveConsentContext(request); const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 25) || 25));
    const cursor = decodeCursor(url.searchParams.get("cursor"));
    const rows = await consentRepository().history(context.enterpriseId, context.relatedSubjectKeys, limit, cursor);
    const hasMore = rows.length > limit; const page = rows.slice(0, limit); const last = page.at(-1);
    return consentResponse({ ok: true, receipts: page, pagination: { limit, hasMore, nextCursor: hasMore && last ? Buffer.from(JSON.stringify([last.occurred_at,last.receipt_id]), "utf8").toString("base64url") : null } }, 200, correlationId);
  } catch (error) { return consentFailure(error, correlationId); }
}
