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

async function logout(req: Request) {
  const supabase = await createClient();
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

  return response;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}
