import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminVerifiedCookieName } from "@/lib/admin-auth";
import {
  getPublicSupabaseEnv,
  hasPublicSupabaseEnv,
  isProductionBuildPhase,
} from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const authTimeoutMs = 5000;

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

async function withAuthTimeout<T>(task: () => Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Supabase auth timed out after ${authTimeoutMs / 1000} seconds.`)),
          authTimeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "Supabase server client"
  );

  const cookieStore = await cookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
      const result = await withAuthTimeout(() => originalGetUser(...args));

      if (isInvalidRefreshTokenError(result.error)) {
        await handleInvalidRefreshSession(result.error);
      }

      return result;
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await handleInvalidRefreshSession(error);
      }

      console.error("Supabase server auth call failed.", error);

      return {
        data: { user: null },
        error: error instanceof Error ? error : new Error("Supabase auth failed."),
      };
    }
  }) as typeof supabase.auth.getUser;

  return supabase;
}

export async function createNavigationClient() {
  if (isProductionBuildPhase() || !hasPublicSupabaseEnv()) {
    return null;
  }

  return createClient();
}
