import { NextResponse } from "next/server";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { checkRequestRateLimit } from "@/lib/security";
import { DelegatedAuthorityError } from "@/lib/operational-entities/delegated-authority";
import {
  DelegatedAuthorityServerError,
  acceptAuthorityDelegation,
  authorityBlastRadius,
  createAuthorityDelegation,
  evaluateStoredDelegatedAction,
  evaluatePersistedInterAgentAction,
  loadDelegatedAuthority,
  reviewAuthorityDelegation,
  revokeAuthorityDelegation,
  revokeParentAuthority,
} from "@/lib/operational-entities/delegated-authority-server";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 131_072;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function failure(error: unknown) {
  if (error instanceof IdentityApiError || error instanceof DelegatedAuthorityServerError || error instanceof DelegatedAuthorityError) return response({ ok: false, error: error.code, message: error.message }, error.status);
  if (error instanceof SyntaxError || error instanceof TypeError) return response({ ok: false, error: "DELEGATION_INPUT_INVALID", message: error.message }, 400);
  console.error("Native delegated-authority request failed.", { code: (error as { code?: string })?.code });
  return response({ ok: false, error: "DELEGATED_AUTHORITY_UNAVAILABLE" }, 503);
}

async function body(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new DelegatedAuthorityServerError("The request body is too large.", "DELEGATION_INPUT_TOO_LARGE", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new DelegatedAuthorityServerError("The request body is too large.", "DELEGATION_INPUT_TOO_LARGE", 413);
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Request body must be an object.");
  return parsed as Record<string, unknown>;
}

export async function GET(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/operational-entities/delegated-authority:get", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer", "observer"]);
    const entityId = decodeURIComponent((await params).entityId);
    const query = new URL(request.url).searchParams;
    if (query.get("blast_radius_for")) return response({ ok: true, blastRadius: await authorityBlastRadius(context, String(query.get("blast_radius_for"))) });
    const authority = await loadDelegatedAuthority(context, entityId, query.get("delegation_id") ?? undefined);
    return response({ ok: true, operationalEntityId: entityId, authority });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/operational-entities/delegated-authority:post", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const entityId = decodeURIComponent((await params).entityId);
    const input = await body(request);
    const action = String(input.action ?? "");
    if (action === "create_delegation") return response({ ok: true, result: await createAuthorityDelegation(context, entityId, input) }, 201);
    if (action === "review_delegation") return response({ ok: true, result: await reviewAuthorityDelegation(context, entityId, String(input.delegationId ?? ""), Boolean(input.approve)) });
    if (action === "accept_delegation") return response({ ok: true, result: await acceptAuthorityDelegation(context, entityId, input) }, 201);
    if (action === "revoke_delegation") return response({ ok: true, result: await revokeAuthorityDelegation(context, entityId, String(input.delegationId ?? ""), String(input.reason ?? "")) });
    if (action === "revoke_parent_authority") return response({ ok: true, result: await revokeParentAuthority(context, entityId, String(input.parentAuthorityId ?? ""), String(input.reason ?? "")) });
    if (action === "evaluate_delegated_action") return response({ ok: true, result: await evaluateStoredDelegatedAction(context, entityId, input) }, 201);
    if (action === "evaluate_inter_agent_action") return response({ ok: true, result: await evaluatePersistedInterAgentAction(context, entityId, input) }, 201);
    throw new DelegatedAuthorityServerError("The delegated-authority action is unsupported.", "DELEGATION_ACTION_UNSUPPORTED");
  } catch (error) {
    return failure(error);
  }
}
