import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminVerifiedCookieName,
  getAdminCookieOptions,
} from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

async function logout(req: Request) {
  const supabase = await createClient();

  await supabase.auth.signOut();

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
