import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const adminVerifiedCookieName = "cyber_admin_verified";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const adminPagePrefixes = [
  "/back-office",
  "/verification-queue",
  "/evidence-vault",
  "/decision-engine",
  "/mission-control",
  "/trust-graph-engine",
];

function isProtectedAdminPath(pathname: string) {
  return (
    adminPagePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) ||
    pathname.startsWith("/api/admin/")
  );
}

function isAdminAccessEndpoint(pathname: string) {
  return pathname === "/api/admin/access";
}

function isAllowlisted(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasAdminCookie = req.cookies.get(adminVerifiedCookieName)?.value === "true";
  const allowed =
    Boolean(user) &&
    isAllowlisted(user?.email) &&
    (isAdminAccessEndpoint(pathname) || hasAdminCookie);

  if (allowed) {
    return response;
  }

  const redirectResponse = NextResponse.redirect(
    new URL("/command-center", req.url)
  );
  redirectResponse.cookies.set(adminVerifiedCookieName, "", {
    path: "/",
    maxAge: 0,
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    "/back-office/:path*",
    "/verification-queue/:path*",
    "/evidence-vault/:path*",
    "/decision-engine/:path*",
    "/mission-control/:path*",
    "/trust-graph-engine/:path*",
    "/api/admin/:path*",
  ],
};
