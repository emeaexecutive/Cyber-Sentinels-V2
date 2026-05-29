import { createBrowserClient } from "@supabase/ssr";

const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const ADMIN_VERIFIED_COOKIE_NAME = "cyber_admin_verified";

function isInvalidRefreshTokenError(error: unknown) {
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

function expireBrowserSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_START_KEY);
  document.cookie = `${ADMIN_VERIFIED_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict`;
  document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-"))
    .forEach((name) => {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    });
  window.location.assign("/login?next=/command-center");
}

async function handleAuthResult<T>(task: () => Promise<T>) {
  try {
    const result = await task();
    const maybeError =
      result && typeof result === "object" && "error" in result
        ? (result as { error?: unknown }).error
        : null;

    if (isInvalidRefreshTokenError(maybeError)) {
      expireBrowserSession();
      return new Promise<T>(() => {});
    }

    return result;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      expireBrowserSession();
      return new Promise<T>(() => {});
    }

    throw error;
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars are missing.");
  }

  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  const originalRefreshSession = supabase.auth.refreshSession.bind(
    supabase.auth
  );

  supabase.auth.getUser = ((...args: Parameters<typeof originalGetUser>) =>
    handleAuthResult(() => originalGetUser(...args))) as typeof supabase.auth.getUser;
  supabase.auth.getSession = ((...args: Parameters<typeof originalGetSession>) =>
    handleAuthResult(() =>
      originalGetSession(...args)
    )) as typeof supabase.auth.getSession;
  supabase.auth.refreshSession = ((
    ...args: Parameters<typeof originalRefreshSession>
  ) =>
    handleAuthResult(() =>
      originalRefreshSession(...args)
    )) as typeof supabase.auth.refreshSession;

  return supabase;
}
