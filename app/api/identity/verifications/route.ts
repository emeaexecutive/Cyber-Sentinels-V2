import { checkRequestRateLimit } from "@/lib/security";
import { buildIdentityAdapters } from "@/lib/identity-signals/adapters";
import { boundedText, isUuid, parseRequestedSignals } from "@/lib/identity-signals/core";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { orchestrateIdentityVerification } from "@/lib/identity-signals/orchestrator";
import { identityRepository } from "@/lib/identity-signals/repository";
import { identityRequestUiState, isStrictVerifiedEvidence } from "@/lib/identity-signals/presentation";
import { startHopaeTrustAssessment } from "@/lib/providers/hopae-rc1-server";

export async function GET(request: Request) {
  const correlationId = identityCorrelationId(request);
  try {
    const context = await resolveIdentityEnterprise(request);
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(10_000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
    const pageSize = Math.max(5, Math.min(50, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20));
    const snapshot = await identityRepository().dashboardSnapshot(context.enterpriseId, page, pageSize);
    return identitySuccess({
      dashboard: {
        ...snapshot,
        requests: snapshot.requests.map((row) => {
          const reasonCodes = [...new Set([
            ...row.evidence.flatMap((item) => item.reason_codes ?? []),
            ...(row.confidence?.reason_codes ?? []),
          ])];
          return {
            id: row.id,
            subjectId: row.subject_id,
            subject: row.subject,
            status: row.status,
            uiState: identityRequestUiState(row.status, row.evidence.map((item) => item.signal_status)),
            purpose: row.purpose,
            requestedSignals: row.requested_signals,
            confidence: row.confidence,
            evidenceCount: row.evidence.length,
            verifiedEvidenceCount: row.evidence.filter(isStrictVerifiedEvidence).length,
            warningCount: row.evidence.filter((item) => item.signal_status !== "PASS").length,
            providerErrors: row.providerErrors,
            reasonCodes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            completedAt: row.completed_at,
          };
        }),
      },
    }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}

export async function POST(request: Request) {
  const correlationId = identityCorrelationId(request);
  const limited = checkRequestRateLimit({ route: "identity-verifications", req: request, limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  try {
    if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ schemaVersion: 1, ok: false, code: "UNSUPPORTED_CONTENT_TYPE", error: "application/json is required.", correlationId }, { status: 415 });
    if (Number(request.headers.get("content-length") ?? 0) > 64_000) return Response.json({ schemaVersion: 1, ok: false, code: "PAYLOAD_TOO_LARGE", error: "Payload is too large.", correlationId }, { status: 413 });
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer"]);
    const idempotencyKey = boundedText(request.headers.get("idempotency-key"), "Idempotency-Key", 160);
    if (idempotencyKey.length < 8) throw new Error("Idempotency-Key must be at least 8 characters.");
    const body = await request.json() as Record<string, unknown>;
    if ("enterpriseId" in body || "enterprise_id" in body) throw new Error("enterpriseId must be selected only with the authorized X-Enterprise-Id header.");
    if (!isUuid(body.subjectId)) throw new Error("A valid subjectId is required.");
    const requestedSignals = parseRequestedSignals(body.requestedSignals);
    const purpose = boundedText(body.purpose, "purpose", 120);
    const signalInputs = body.signalInputs && typeof body.signalInputs === "object" && !Array.isArray(body.signalInputs) ? body.signalInputs as Record<string, unknown> : {};
    const hopaeStarter = async () => {
      const hopae = signalInputs.hopae;
      if (!hopae || typeof hopae !== "object" || Array.isArray(hopae)) throw new Error("Hopae requires signalInputs.hopae workflowId, requestedAction, and requestedPurpose.");
      const values = hopae as Record<string, unknown>;
      const started = await startHopaeTrustAssessment({ supabase: context.supabase, user: context.user, appUrl: new URL(request.url).origin, body: { tenant_id: context.enterpriseId, workspace_id: context.enterpriseId, workflow_id: values.workflowId, entity_id: body.subjectId, requested_action: values.requestedAction, requested_purpose: values.requestedPurpose ?? purpose } });
      return { providerReference: started.providerReference, correlationId: started.correlationId };
    };
    const result = await orchestrateIdentityVerification({ repository: identityRepository(), adapters: buildIdentityAdapters(hopaeStarter), enterpriseId: context.enterpriseId, subjectId: body.subjectId, requestedSignals, purpose, idempotencyKey, actorId: context.user.id, signalInputs, correlationId });
    return identitySuccess({ verification: result.details, replayed: result.replayed, reasonCode: result.reasonCode }, result.replayed ? 200 : 202, result.correlationId);
  } catch (error) {
    if (error instanceof Error && "status" in error) return Response.json({ schemaVersion: 1, ok: false, code: (error as Error & { code?: string }).code, error: error.message, correlationId }, { status: Number((error as Error & { status?: number }).status ?? 409) });
    return identityFailure(error, correlationId);
  }
}
