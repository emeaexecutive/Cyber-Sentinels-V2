import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  adminVerifiedCookieName,
  getAdminAccessFailureReason,
  hasAdminVerifiedCookie,
} from "@/lib/admin-auth";
import type { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminCheckResult =
  | { ok: true; user: User }
  | {
      ok: false;
      user: User | null;
      reason:
        | "unauthenticated"
        | "admin_not_configured"
        | "not_allowlisted"
        | "missing_admin_cookie";
    };

export async function clearAdminState() {
  const cookieStore = await cookies();

  try {
    cookieStore.set(adminVerifiedCookieName, "", {
      path: "/",
      maxAge: 0,
    });
  } catch {
    // Cookie writes are not available from every server context.
  }
}

async function auditAdminAccess(
  supabase: SupabaseServerClient,
  eventType: "admin_access_verified" | "admin_access_denied",
  actor: string,
  metadata: Record<string, unknown>
) {
  try {
    await createAuditLog(supabase, eventType, actor, metadata);
  } catch (error) {
    console.warn("Admin access audit failed", error);
  }
}

export async function checkAdminAccess(
  supabase: SupabaseServerClient,
  options: { requireCookie?: boolean } = {}
): Promise<AdminCheckResult> {
  const requireCookie = options.requireCookie ?? true;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Supabase session missing for admin access check.");
    return { ok: false, user: null, reason: "unauthenticated" };
  }

  const adminFailureReason = getAdminAccessFailureReason(user.email);

  if (adminFailureReason === "admin_not_configured") {
    return { ok: false, user, reason: "admin_not_configured" };
  }

  if (adminFailureReason === "forbidden") {
    return { ok: false, user, reason: "not_allowlisted" };
  }

  if (requireCookie && !(await hasAdminVerifiedCookie())) {
    return { ok: false, user, reason: "missing_admin_cookie" };
  }

  return { ok: true, user };
}

export async function requireAdminPageAccess(
  supabase: SupabaseServerClient,
  metadata: Record<string, unknown> = {}
) {
  const result = await checkAdminAccess(supabase);

  if (!result.ok) {
    await clearAdminState();
    await auditAdminAccess(
      supabase,
      "admin_access_denied",
      result.user?.email ?? result.user?.id ?? "unknown",
      { ...metadata, reason: result.reason }
    );
    const message =
      result.reason === "admin_not_configured"
        ? "admin_not_configured"
        : "admin_access_required";
    redirect(`/command-center?message=${message}`);
  }

  await auditAdminAccess(supabase, "admin_access_verified", result.user.email ?? result.user.id, metadata);

  return result.user;
}

export async function requireAdminApiAccess(
  req: Request,
  supabase: SupabaseServerClient,
  options: { requireCookie?: boolean; audit?: boolean } = {}
) {
  const audit = options.audit ?? true;
  const result = await checkAdminAccess(supabase, options);

  if (result.ok) {
    if (audit) {
      await auditAdminAccess(
        supabase,
        "admin_access_verified",
        result.user.email ?? result.user.id,
        {
          path: new URL(req.url).pathname,
        }
      );
    }

    return { ok: true as const, user: result.user };
  }

  await clearAdminState();
  if (audit) {
    await auditAdminAccess(
      supabase,
      "admin_access_denied",
      result.user?.email ?? result.user?.id ?? "unknown",
      {
        path: new URL(req.url).pathname,
        reason: result.reason,
      }
    );
  }

  return {
    ok: false as const,
    response: NextResponse.redirect(
      new URL(
        `/command-center?message=${
          result.reason === "admin_not_configured"
            ? "admin_not_configured"
            : "admin_access_required"
        }`,
        req.url
      ),
      {
        status: 303,
      }
    ),
  };
}
