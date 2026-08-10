import { NextResponse } from "next/server";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { checkRequestRateLimit } from "@/lib/security";
import { NativeEnforcementError } from "@/lib/operational-entities/native-enforcement";
import {
  NativeEnforcementServerError,
  ingestNativeDestinationObservation,
  injectControlledExecutionAfterDeny,
  loadNativeEnforcement,
  recordNativeEnforcementApproval,
  requestNativeEnforcement,
} from "@/lib/operational-entities/native-enforcement-server";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 131_072;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function failure(error: unknown) {
  if (error instanceof IdentityApiError || error instanceof NativeEnforcementError || error instanceof NativeEnforcementServerError) return response({ ok: false, error: error.code, message: error.message }, error.status);
  if (error instanceof SyntaxError || error instanceof TypeError) return response({ ok: false, error: "ENFORCEMENT_INPUT_INVALID", message: error.message }, 400);
  console.error("Native enforcement request failed safely.", { code: (error as { code?: string })?.code ?? "UNKNOWN" });
  return response({ ok: false, error: "NATIVE_ENFORCEMENT_UNAVAILABLE" }, 503);
}

async function body(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new NativeEnforcementServerError("The request body is too large.", "ENFORCEMENT_INPUT_TOO_LARGE", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new NativeEnforcementServerError("The request body is too large.", "ENFORCEMENT_INPUT_TOO_LARGE", 413);
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Request body must be an object.");
  return parsed as Record<string, unknown>;
}

export async function GET(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/operational-entities/enforcement:get", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer", "observer"]);
    const entityId = decodeURIComponent((await params).entityId);
    const transactionId = new URL(request.url).searchParams.get("transaction_id") ?? undefined;
    return response({ ok: true, operationalEntityId: entityId, enforcement: await loadNativeEnforcement(context, entityId, transactionId) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/operational-entities/enforcement:post", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const entityId = decodeURIComponent((await params).entityId);
    const input = await body(request);
    const action = String(input.action ?? "");
    if (action === "approve_enforcement") return response({ ok: true, result: await recordNativeEnforcementApproval(context, entityId, input) }, 201);
    if (action === "request_enforcement") return response({ ok: true, result: await requestNativeEnforcement(context, entityId, input) }, 201);
    if (action === "ingest_destination_observation") return response({ ok: true, result: await ingestNativeDestinationObservation(context, entityId, input) }, 201);
    if (action === "inject_control_failure") return response({ ok: true, result: await injectControlledExecutionAfterDeny(context, entityId, input) }, 201);
    throw new NativeEnforcementServerError("The native-enforcement action is unsupported.", "ENFORCEMENT_ACTION_UNSUPPORTED");
  } catch (error) {
    return failure(error);
  }
}
