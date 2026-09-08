import { checkRequestRateLimit } from "@/lib/security";

export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "world-id-callback", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ ok: false, code: "UNSUPPORTED_CONTENT_TYPE", error: "application/json is required." }, { status: 415 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64_000) return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Payload is too large." }, { status: 413 });
  await request.text();
  return Response.json({ schemaVersion: 1, ok: false, status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", reasonCode: "WORLD_ID_CALLBACK_NOT_USED", confidence: 0, serverVerified: false, providerVerified: false, message: "World ID proofs must use the authenticated verification endpoint.", error: "Use /api/verify/world after the IDKit human interaction." }, { status: 410 });
}
