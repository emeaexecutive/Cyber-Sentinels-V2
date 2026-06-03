import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const adminVerifiedCookieName = "cyber_admin_verified";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const userPagePrefixes = [
  "/passport",
  "/passports",
  "/evidence-upload",
  "/trust-assistant",
  "/knowledge-base",
];

const adminPagePrefixes = [
  "/back-office",
  "/verification-queue",
  "/evidence-vault",
  "/trust-intelligence",
  "/trust-graph-engine",
  "/workforce-trust",
  "/intent-verification",
  "/autonomy-governance",
  "/execution-passports",
  "/state-verification",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isProtectedUserPath(pathname: string) {
  return matchesPrefix(pathname, userPagePrefixes);
}

function isProtectedAdminPath(pathname: string) {
  return matchesPrefix(pathname, adminPagePrefixes) || pathname.startsWith("/api/admin/");
}

function isAdminAccessEndpoint(pathname: string) {
  return pathname === "/api/admin/access";
}

function isBackOfficePage(pathname: string) {
  return pathname === "/back-office" || pathname.startsWith("/back-office/");
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

function clearAdminCookie(response: NextResponse) {
  response.cookies.set(adminVerifiedCookieName, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const protectsUser = isProtectedUserPath(pathname);
  const protectsAdmin = isProtectedAdminPath(pathname);

  if (!protectsUser && !protectsAdmin) {
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

  if (!user) {
    if (protectsAdmin) {
      return clearAdminCookie(redirectTo(req, "/login?next=/back-office"));
    }

    return redirectTo(
      req,
      `/login?next=${encodeURIComponent(`${pathname}${search}`)}`
    );
  }

  if (protectsUser && !protectsAdmin) {
    return response;
  }

  const allowlisted = isAllowlisted(user.email);

  if (!allowlisted) {
    return clearAdminCookie(
      redirectTo(req, "/command-center?message=admin_access_required")
    );
  }

  if (isAdminAccessEndpoint(pathname) || isBackOfficePage(pathname)) {
    return response;
  }

  const hasAdminCookie = req.cookies.get(adminVerifiedCookieName)?.value === "true";

  if (hasAdminCookie) {
    return response;
  }

  return redirectTo(req, "/back-office?denied=1");
}

export const config = {
  matcher: [
    "/passport/:path*",
    "/passports/:path*",
    "/evidence-upload/:path*",
    "/trust-assistant/:path*",
    "/knowledge-base/:path*",
    "/back-office/:path*",
    "/verification-queue/:path*",
    "/evidence-vault/:path*",
    "/trust-intelligence/:path*",
    "/trust-graph-engine/:path*",
    "/workforce-trust/:path*",
    "/intent-verification/:path*",
    "/autonomy-governance/:path*",
    "/execution-passports/:path*",
    "/state-verification/:path*",
    "/api/admin/:path*",
  ],
};
