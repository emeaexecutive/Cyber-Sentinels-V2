import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminEmailsEnv, getPublicSupabaseEnv } from "@/lib/env";

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
  "/data-rights",
  "/messages",
  "/notifications",
  "/appeals",
  "/feedback",
  "/developers/api-keys",
];

const adminPagePrefixes = [
  "/back-office",
  "/admin/agents",
  "/verification-queue",
  "/evidence-vault",
  "/decision-engine",
  "/trust-intelligence",
  "/trust-graph-engine",
  "/mission-control",
  "/signals",
  "/workforce-trust",
  "/intent-verification",
  "/autonomy-governance",
  "/execution-passports",
  "/state-verification",
  "/agents",
  "/trust-events",
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

function getAdminEmails() {
  try {
    return getAdminEmailsEnv("middleware admin allowlist")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isAdminConfigured() {
  const configured = getAdminEmails().length > 0;

  if (!configured) {
    console.error("Middleware admin redirect reason: ADMIN_EMAILS missing.");
  }

  return configured;
}

function isAllowlisted(email: string | null | undefined) {
  if (!email) {
    console.error("Middleware admin redirect reason: Supabase session email missing.");
    return false;
  }

  const adminEmails = getAdminEmails();
  const normalizedEmail = email.trim().toLowerCase();
  const allowlisted = adminEmails.includes(normalizedEmail);

  if (!allowlisted) {
    console.error("Middleware admin redirect reason: admin email mismatch.", {
      email: normalizedEmail,
      configuredAdminCount: adminEmails.length,
    });
  }

  return allowlisted;
}

function clearAdminCookie(response: NextResponse) {
  response.cookies.set(adminVerifiedCookieName, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

function redirectTo(req: NextRequest, path: string) {
  console.error("Middleware redirect.", {
    from: req.nextUrl.pathname,
    to: path,
  });

  return NextResponse.redirect(new URL(path, req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const protectsUser = isProtectedUserPath(pathname);
  const protectsAdmin = isProtectedAdminPath(pathname);

  if (!protectsUser && !protectsAdmin) {
    return NextResponse.next();
  }

  let supabaseEnv;

  try {
    supabaseEnv = getPublicSupabaseEnv("middleware Supabase client");
  } catch (error) {
    console.error("Middleware Supabase client unavailable.", error);
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  const supabase = createServerClient(
    supabaseEnv.supabaseUrl,
    supabaseEnv.supabaseAnonKey,
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
  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("Supabase middleware auth failed.", error);
  }

  if (!user) {
    console.error("Middleware redirect reason: Supabase session missing.", {
      pathname,
    });

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

  if (protectsAdmin && !isAdminConfigured()) {
    if (isBackOfficePage(pathname)) {
      console.error("Middleware allowing Back Office to render admin_not_configured gate.");
      return clearAdminCookie(response);
    }

    return clearAdminCookie(
      redirectTo(req, "/command-center?message=admin_not_configured")
    );
  }

  const allowlisted = isAllowlisted(user.email);

  if (!allowlisted) {
    if (isBackOfficePage(pathname)) {
      console.error("Middleware allowing Back Office to render not_allowlisted gate.");
      return clearAdminCookie(response);
    }

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

  console.error("Middleware admin redirect reason: missing admin verification cookie.", {
    pathname,
  });
  return redirectTo(req, "/back-office?denied=1");
}

export const config = {
  matcher: [
    "/passport/:path*",
    "/passports/:path*",
    "/evidence-upload/:path*",
    "/trust-assistant/:path*",
    "/knowledge-base/:path*",
    "/data-rights/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/appeals/:path*",
    "/feedback/:path*",
    "/developers/api-keys/:path*",
    "/back-office/:path*",
    "/admin/agents/:path*",
    "/verification-queue/:path*",
    "/evidence-vault/:path*",
    "/decision-engine/:path*",
    "/trust-intelligence/:path*",
    "/trust-graph-engine/:path*",
    "/mission-control/:path*",
    "/signals/:path*",
    "/workforce-trust/:path*",
    "/intent-verification/:path*",
    "/autonomy-governance/:path*",
    "/execution-passports/:path*",
    "/state-verification/:path*",
    "/agents/:path*",
    "/trust-events/:path*",
    "/api/admin/:path*",
  ],
};
