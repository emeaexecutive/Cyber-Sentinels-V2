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

async function logout(req: Request) {
  console.error("auth logout called", {
    method: req.method,
    route: new URL(req.url).pathname,
    referer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent"),
  });

  const supabase = await createClient();

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
