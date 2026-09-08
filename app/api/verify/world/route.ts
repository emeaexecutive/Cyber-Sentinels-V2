import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { executeWorldIdQualification } from "@/lib/providers/world-id-qualification-server";
import { WorldIdQualificationError } from "@/lib/providers/world-id-qualification";
import { resolveSessionTenant } from "@/lib/trust-transaction/server";
import { enterpriseSubjectClasses } from "@/src/lib/trust-fabric/types";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digestPattern = /^[a-f0-9]{64}$/;
const referencePattern = /^[a-zA-Z0-9_.:/-]{1,180}$/;

function validText(value: unknown, maximum = 300) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const user = await requireAuthenticatedUser(supabase);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const idkitResponse = body?.idkitResponse;
    const proof = idkitResponse && typeof idkitResponse === "object" ? idkitResponse as Record<string, unknown> : null;
    const responses = Array.isArray(proof?.responses) ? proof.responses : [];
    const hasProof = proof?.protocol_version === "4.0"
      && typeof proof.action === "string"
      && responses.length > 0
      && responses.length <= 10;
    if (!body || !hasProof) return NextResponse.json({ ok: false, error: "INVALID_WORLD_ID_PROOF" }, { status: 400 });
    if ("tenantId" in body || "enterpriseId" in body || "tenant_id" in body || "enterprise_id" in body) {
      return NextResponse.json({ ok: false, error: "CLIENT_TENANT_CONTEXT_FORBIDDEN" }, { status: 400 });
    }

    const subjectId = String(body.subjectId ?? "");
    const subjectType = String(body.subjectType ?? "");
    const requestedAction = String(body.requestedAction ?? "");
    const requestedPurpose = String(body.requestedPurpose ?? "");
    const resource = String(body.resource ?? "");
    const environment = String(body.environment ?? "");
    const payloadDigest = String(body.payloadDigest ?? "");
    const operationalEntityId = body.operationalEntityId ? String(body.operationalEntityId) : null;
    if (!uuidPattern.test(subjectId)
      || !enterpriseSubjectClasses.includes(subjectType as (typeof enterpriseSubjectClasses)[number])
      || !referencePattern.test(requestedAction)
      || !referencePattern.test(requestedPurpose)
      || !validText(resource)
      || !referencePattern.test(environment)
      || !digestPattern.test(payloadDigest)
      || (operationalEntityId !== null && !referencePattern.test(operationalEntityId))) {
      return NextResponse.json({ ok: false, error: "INVALID_QUALIFICATION_CONTEXT" }, { status: 400 });
    }

    const tenant = await resolveSessionTenant(supabase, user);
    const result = await executeWorldIdQualification({
      tenantId: tenant.id,
      actorId: user.id,
      subjectId,
      subjectType: subjectType as (typeof enterpriseSubjectClasses)[number],
      operationalEntityId,
      requestedAction,
      requestedPurpose,
      resource,
      environment,
      payloadDigest,
      idkitResponse,
    }, { supabase, user });
    return NextResponse.json(result, { status: 201, headers: { "cache-control": "private, no-store", location: result.receiptReference } });
  } catch (error) {
    if (error instanceof WorldIdQualificationError) {
      return NextResponse.json(error.result, { status: error.status, headers: { "cache-control": "private, no-store" } });
    }
    console.error("World ID qualification failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
    return NextResponse.json({ ok: false, error: "WORLD_ID_QUALIFICATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
