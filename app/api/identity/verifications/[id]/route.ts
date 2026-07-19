import { isUuid } from "@/lib/identity-signals/core";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = identityCorrelationId(request);
  try {
    const context = await resolveIdentityEnterprise(request);
    const { id } = await params;
    if (!isUuid(id)) throw new Error("A valid verification id is required.");
    const details = await identityRepository().requestDetails(context.enterpriseId, id);
    if (!details) return Response.json({ schemaVersion: 1, ok: false, code: "NOT_FOUND", error: "Verification was not found in this enterprise.", correlationId }, { status: 404 });
    return identitySuccess({ verification: details }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}
