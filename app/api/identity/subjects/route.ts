import { createHmac } from "node:crypto";
import { checkRequestRateLimit } from "@/lib/security";
import { boundedText } from "@/lib/identity-signals/core";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";

export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "identity-subjects", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ ok: false, code: "UNSUPPORTED_CONTENT_TYPE", error: "application/json is required." }, { status: 415 });
    if (Number(request.headers.get("content-length") ?? 0) > 32_000) return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Payload is too large." }, { status: 413 });
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer"]);
    const body = await request.json() as Record<string, unknown>;
    if ("enterpriseId" in body || "enterprise_id" in body) throw new Error("enterpriseId must be selected only with the authorized X-Enterprise-Id header.");
    const subjectType = boundedText(body.subjectType, "subjectType", 40).toLowerCase();
    if (!["human","agent","candidate","customer","employee","contractor","other"].includes(subjectType)) throw new Error("subjectType is not supported.");
    const displayLabel = body.displayLabel ? boundedText(body.displayLabel, "displayLabel", 120) : null;
    let externalReferenceHash: string | null = null;
    if (body.externalReference) {
      const secret = process.env.SECURITY_HASH_SECRET?.trim();
      if (!secret) throw new Error("SECURITY_HASH_SECRET is required before external references can be accepted.");
      externalReferenceHash = createHmac("sha256", secret).update(`${context.enterpriseId}:${boundedText(body.externalReference, "externalReference", 200)}`).digest("hex");
    }
    const subject = await identityRepository().createSubject({ enterpriseId: context.enterpriseId, subjectType, displayLabel, externalReferenceHash, metadata: {}, actorId: context.user.id });
    return identitySuccess({ subject }, 201);
  } catch (error) { return identityFailure(error); }
}
