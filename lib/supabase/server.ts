import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminVerifiedCookieName } from "@/lib/admin-auth";
import { assertServerEnv } from "@/lib/security";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    code === "refresh_token_not_found" ||
    (name === "AuthApiError" &&
      message.includes("refresh token") &&
      message.includes("not found")) ||
    message.includes("invalid refresh token")
  );
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  const expiredCookie = {
    path: "/",
    maxAge: 0,
  };

  try {
    cookieStore
      .getAll()
      .filter(
        (cookie) =>
          cookie.name.startsWith("sb-") ||
          cookie.name === adminVerifiedCookieName
      )
      .forEach((cookie) => {
        cookieStore.set(cookie.name, "", expiredCookie);
      });
  } catch {
    // Cookie writes are not available from every server rendering context.
  }
}

async function handleInvalidRefreshSession(error: unknown) {
  if (!isInvalidRefreshTokenError(error)) {
    throw error;
  }

  await clearAuthCookies();
  redirect("/login?next=/command-center");
}

export async function createClient() {
  assertServerEnv();

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore when called from a Server Component.
          }
        },
      },
    }
  );

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

  supabase.auth.getUser = (async (...args: Parameters<typeof originalGetUser>) => {
    try {
      const result = await originalGetUser(...args);

      if (isInvalidRefreshTokenError(result.error)) {
        await handleInvalidRefreshSession(result.error);
      }

      return result;
    } catch (error) {
      await handleInvalidRefreshSession(error);
    }
  }) as typeof supabase.auth.getUser;

  return supabase;
}
