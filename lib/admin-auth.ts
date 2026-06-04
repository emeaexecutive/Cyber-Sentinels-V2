import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

export const adminVerifiedCookieName = "cyber_admin_verified";
export const adminVerifiedMaxAge = 60 * 60 * 8;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminAccessResult =
  | { ok: true; user: User }
  | {
      ok: false;
      status: 401 | 403;
      reason:
        | "unauthenticated"
        | "admin_not_configured"
        | "forbidden"
        | "missing_admin_cookie";
    };

export function getAdminEmails() {
  const rawEmails = process.env.ADMIN_EMAILS ?? "";

  if (!rawEmails.trim()) {
    console.error("Admin access is not configured: ADMIN_EMAILS is missing.");
  }

  return rawEmails
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase())
    .filter(Boolean);
}

export function isAdminConfigured() {
  return getAdminEmails().length > 0;
}

export function isAdminAllowlisted(email: string | null | undefined) {
  if (!email) {
    console.error("Admin allowlist check failed: Supabase session email is missing.");
    return false;
  }

  const adminEmails = getAdminEmails();
  const normalizedEmail = email.trim().toLocaleLowerCase();
  const allowlisted = adminEmails.includes(normalizedEmail);

  if (!allowlisted) {
    console.error("Admin email mismatch.", {
      email: normalizedEmail,
      configuredAdminCount: adminEmails.length,
    });
  }

  return allowlisted;
}

export function getAdminAccessFailureReason(email: string | null | undefined) {
  const adminEmails = getAdminEmails();

  if (adminEmails.length === 0) {
    return "admin_not_configured" as const;
  }

  if (!email) {
    return "forbidden" as const;
  }

  const normalizedEmail = email.trim().toLocaleLowerCase();

  if (!adminEmails.includes(normalizedEmail)) {
    console.error("Admin email mismatch.", {
      email: normalizedEmail,
      configuredAdminCount: adminEmails.length,
    });
    return "forbidden" as const;
  }

  return null;
}

export async function hasAdminVerifiedCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(adminVerifiedCookieName)?.value === "true";
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: true,
    path: "/",
    maxAge: adminVerifiedMaxAge,
  };
}

export async function requireAdminAccess(
  supabase: SupabaseServerClient
): Promise<AdminAccessResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Supabase session missing for admin access.");
    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  const adminFailureReason = getAdminAccessFailureReason(user.email);

  if (adminFailureReason) {
    return { ok: false, status: 403, reason: adminFailureReason };
  }

  if (!(await hasAdminVerifiedCookie())) {
    return { ok: false, status: 403, reason: "missing_admin_cookie" };
  }

  return { ok: true, user };
}
