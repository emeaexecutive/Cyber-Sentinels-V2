import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminVerifiedCookieName,
  getAdminCookieOptions,
} from "@/lib/admin-auth";
import {
  createClient,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";
import { recordAuthReplayEvent } from "@/lib/auth/auth-replay-events";
import {
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions,
} from "@/lib/auth/password-recovery";

async function logout(req: Request) {
  const authHeaders = new Headers();
  const supabase = await createClient(authHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordAuthReplayEvent(supabase, {
      user,
      eventType: "logout",
      request: req,
      decision: "allow",
      trustPosture: "session_closed",
    });
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error && !isInvalidRefreshTokenError(error)) {
      throw error;
    }
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) {
      throw error;
    }
  }

  const response = NextResponse.redirect(new URL("/login", req.url), {
    status: 303,
  });
  response.headers.set(
    "Cache-Control",
    authHeaders.get("Cache-Control") ??
      "private, no-cache, no-store, must-revalidate, max-age=0"
  );
  response.headers.set("Expires", authHeaders.get("Expires") ?? "0");
  response.headers.set("Pragma", authHeaders.get("Pragma") ?? "no-cache");
  const cookieStore = await cookies();

  cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
      });
    });

  response.cookies.set(adminVerifiedCookieName, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(
    PASSWORD_RECOVERY_COOKIE,
    "",
    passwordRecoveryCookieOptions(0),
  );

  return response;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}
