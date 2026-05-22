import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

export const adminVerifiedCookieName = "cyber_admin_verified";
export const adminVerifiedMaxAge = 60 * 60 * 8;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminAccessResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; reason: "unauthenticated" | "forbidden" };

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminAllowlisted(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}

export async function hasAdminVerifiedCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(adminVerifiedCookieName)?.value === "true";
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
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
    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  if (!isAdminAllowlisted(user.email)) {
    return { ok: false, status: 403, reason: "forbidden" };
  }

  if (!(await hasAdminVerifiedCookie())) {
    return { ok: false, status: 403, reason: "forbidden" };
  }

  return { ok: true, user };
}
