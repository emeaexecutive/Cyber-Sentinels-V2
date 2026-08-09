import { NextResponse } from "next/server";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { checkRequestRateLimit } from "@/lib/security";
import { NativeVerificationError, type OperationalEntityManifest } from "@/lib/operational-entities/native-verification";
import {
  NativeVerificationServerError,
  issueStoredNativeChallenge,
  loadNativeVerification,
  registerNativeCredential,
  registerNativeManifest,
  revokeNativeCredential,
  revokeNativeManifest,
  revokeNativeOwnerBinding,
  submitNativeProof,
} from "@/lib/operational-entities/native-verification-server";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 131_072;

function expectedAudience(request: Request) {
  const configured = process.env.NATIVE_VERIFICATION_AUDIENCE?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new NativeVerificationServerError("The configured native-verification audience is invalid.", "NATIVE_AUDIENCE_CONFIGURATION_INVALID", 503);
    return url.toString().replace(/\/$/u, "");
  }
  const origin = new URL(request.url).origin;
  return `${origin}/native-verification`;
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function failure(error: unknown) {
  if (error instanceof IdentityApiError || error instanceof NativeVerificationServerError || error instanceof NativeVerificationError) {
    return response({ ok: false, error: error.code, message: error.message }, error.status);
  }
  if (error instanceof SyntaxError || error instanceof TypeError) return response({ ok: false, error: "NATIVE_INPUT_INVALID" }, 400);
  console.error("Native Operational Entity verification request failed.", { code: (error as { code?: string })?.code });
  return response({ ok: false, error: "NATIVE_VERIFICATION_UNAVAILABLE" }, 503);
}

async function body(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new NativeVerificationServerError("The request body is too large.", "NATIVE_INPUT_TOO_LARGE", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new NativeVerificationServerError("The request body is too large.", "NATIVE_INPUT_TOO_LARGE", 413);
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Request body must be an object.");
  return parsed as Record<string, unknown>;
}

export async function GET(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const rateLimited = checkRequestRateLimit({ route: "/api/operational-entities/native-verification:get", req: request, limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer", "observer"]);
    const entityId = decodeURIComponent((await params).entityId);
    const verification = await loadNativeVerification(context, entityId);
    return response({ ok: true, operationalEntityId: entityId, verification });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const rateLimited = checkRequestRateLimit({ route: "/api/operational-entities/native-verification:post", req: request, limit: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const entityId = decodeURIComponent((await params).entityId);
    const input = await body(request);
    const action = String(input.action ?? "");
    if (action === "register_credential") {
      const result = await registerNativeCredential(context, entityId, input);
      return response({ ok: true, result }, 201);
    }
    if (action === "rotate_credential") {
      if (!input.rotateFromCredentialId) throw new NativeVerificationServerError("rotateFromCredentialId is required.", "ROTATION_SOURCE_REQUIRED");
      const result = await registerNativeCredential(context, entityId, input);
      return response({ ok: true, result }, 201);
    }
    if (action === "register_manifest") {
      const result = await registerNativeManifest(context, entityId, input.manifest as OperationalEntityManifest);
      return response({ ok: true, result }, 201);
    }
    if (action === "issue_challenge") {
      const result = await issueStoredNativeChallenge(context, entityId, expectedAudience(request));
      return response({ ok: true, result }, 201);
    }
    if (action === "submit_proof") {
      const result = await submitNativeProof(context, entityId, input, expectedAudience(request));
      return response({ ok: true, ...result }, result.result.evidence ? 201 : 409);
    }
    if (action === "revoke_credential") {
      const result = await revokeNativeCredential(context, entityId, String(input.credentialId ?? ""), String(input.reason ?? ""));
      return response({ ok: true, result });
    }
    if (action === "revoke_manifest") {
      const result = await revokeNativeManifest(context, entityId, String(input.manifestId ?? ""), String(input.reason ?? ""));
      return response({ ok: true, result });
    }
    if (action === "revoke_owner_binding") {
      const result = await revokeNativeOwnerBinding(context, entityId, String(input.reason ?? ""));
      return response({ ok: true, result });
    }
    throw new NativeVerificationServerError("The native verification action is unsupported.", "NATIVE_ACTION_UNSUPPORTED");
  } catch (error) {
    return failure(error);
  }
}
