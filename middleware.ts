import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAdminEmailsEnv,
  getPublicSupabaseEnv,
  hasPublicSupabaseEnv,
} from "@/lib/env";
import { isMissingAuthSessionError } from "@/lib/supabase/auth-errors";

const adminVerifiedCookieName = "cyber_admin_verified";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const userPagePrefixes = [
  "/agents",
  "/billing",
  "/clearances",
  "/client-portal",
  "/compliance-export",
  "/passport",
  "/passports",
  "/evidence-upload",
  "/enterprise/pilot-setup",
  "/trust-assistant",
  "/knowledge-base",
  "/data-rights",
  "/messages",
  "/notifications",
  "/pilot",
  "/appeals",
  "/feedback",
  "/hiring-shield",
  "/recruiter/dashboard",
  "/replay",
  "/dashboard",
  "/dashboard/interview-risk",
  "/developers/api-keys",
  "/workspace",
  "/agents/register",
  "/timeline",
  "/team-access",
  "/team-workspace",
  "/trust",
  "/trust-replay",
  "/trust-center",
  "/verify/session",
  "/verify/candidate",
  "/verify/recruiter",
  "/verify/provenance",
  "/verification/receipt",
  "/verifier-network",
  "/interview/session",
];

const adminPagePrefixes = [
  "/back-office",
  "/admin",
  "/admin/api-tests",
  "/admin/integrations",
  "/admin/launch-control",
  "/admin/readiness-gate",
  "/admin/founder-control",
  "/admin/agents",
  "/admin/reviews",
  "/enterprise/control-plane",
  "/enterprise/auditability",
  "/enterprise/readiness",
  "/enterprise/compliance",
  "/enterprise/identity-governance",
  "/enterprise/consortium",
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
  "/trust-events",
  "/trustops",
  "/launch-control",
];

const internalToolingPrefixes = [
  "/api-docs",
  "/api/demo/seed",
  "/api/providers",
  "/api/status",
  "/architecture",
  "/command-center",
  "/demo-lab",
  "/developer-console",
  "/dashboard/validation",
  "/launch-console",
  "/qa-console",
  "/status",
  "/api/ai-governance/analyze",
  "/api/hpg/analyze",
  "/api/origin/analyze",
  "/api/reality-twin/analyze",
  "/api/trust-algorithm/run",
  "/api/trust-events",
  "/api/trust-recovery",
];

const experimentalPagePrefixes = [
  "/agent-passport",
  "/agent-registry",
  "/deepfake-detection",
  "/global-trust",
  "/human-presence-genome",
  "/human-presence-index",
  "/linkedin-verification",
  "/marketplace-trust",
  "/origin-dna",
  "/origin-trace",
  "/permissions-firewall",
  "/policy-engine",
  "/profile",
  "/reality-chain",
  "/reality-os",
  "/reality-passport",
  "/reality-twin",
  "/revocation-engine",
  "/synthetic-counterpart",
  "/trust-algorithm",
  "/trust-badges",
  "/trust-embeds",
  "/trust-evaluation-lab",
  "/trust-fabric",
  "/trust-feed",
  "/trust-graph",
  "/trust-graph-explorer",
  "/trust-ledger",
  "/trust-os",
  "/trust-prediction",
  "/trust-radar",
  "/trust-recovery",
  "/trust-registry",
  "/trust-seal-authority",
  "/trust-timeline",
  "/video-verification",
  "/step-up-verification",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isProtectedUserPath(pathname: string) {
  if (
    pathname === "/trust" ||
    pathname === "/trust/data-sovereignty" ||
    pathname === "/replay/demo" ||
    pathname === "/verification/receipt/demo"
  ) {
    return false;
  }
  return matchesPrefix(pathname, userPagePrefixes);
}

function isProtectedAdminPath(pathname: string) {
  return (
    matchesPrefix(pathname, adminPagePrefixes) ||
    matchesPrefix(pathname, internalToolingPrefixes) ||
    matchesPrefix(pathname, experimentalPagePrefixes) ||
    pathname.startsWith("/api/admin/")
  );
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

function isEmailVerified(user: unknown) {
  const candidate = user as { email_confirmed_at?: string | null; confirmed_at?: string | null; email?: string | null };
  return Boolean(candidate.email_confirmed_at || candidate.confirmed_at);
}

function clearAdminCookie(response: NextResponse) {
  response.cookies.set(adminVerifiedCookieName, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

function preventIndexing(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function redirectTo(req: NextRequest, path: string) {
  return preventIndexing(NextResponse.redirect(new URL(path, req.url)));
}

function protectedSurfaceUnavailable() {
  return preventIndexing(
    new NextResponse("Protected surface unavailable.", { status: 503 })
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Provider callbacks authenticate with a timestamped HMAC in the route.
  // Browser GET access to the provider registry remains session-protected.
  if (pathname === "/api/providers" && req.method === "POST") {
    return NextResponse.next();
  }
  const protectsUser = isProtectedUserPath(pathname);
  const protectsAdmin = isProtectedAdminPath(pathname);

  if (!protectsUser && !protectsAdmin) {
    return NextResponse.next();
  }

  if (!hasPublicSupabaseEnv()) {
    return protectedSurfaceUnavailable();
  }

  let supabaseEnv;
  try {
    supabaseEnv = getPublicSupabaseEnv("middleware Supabase client");
  } catch {
    return protectedSurfaceUnavailable();
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  response = preventIndexing(response);
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
  let authError: unknown = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;

    if (authError && !isMissingAuthSessionError(authError)) {
      console.error("Supabase middleware auth failed.", authError);
    }
  } catch (error) {
    authError = error;

    if (!isMissingAuthSessionError(error)) {
      console.error("Supabase middleware auth failed.", error);
    }
  }

  if (!user) {
    const nextPath = `${pathname}${search}`;

    if (protectsAdmin) {
      return clearAdminCookie(
        redirectTo(req, `/login?next=${encodeURIComponent(nextPath)}`)
      );
    }

    return redirectTo(
      req,
      `/login?next=${encodeURIComponent(nextPath)}`
    );
  }

  if (!isEmailVerified(user)) {
    const nextPath = `${pathname}${search}`;
    return clearAdminCookie(
      redirectTo(req, `/verify-email?next=${encodeURIComponent(nextPath)}`)
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
      redirectTo(req, "/back-office?denied=1&reason=admin_not_configured")
    );
  }

  const allowlisted = isAllowlisted(user.email);

  if (!allowlisted) {
    if (isBackOfficePage(pathname)) {
      console.error("Middleware allowing Back Office to render not_allowlisted gate.");
      return clearAdminCookie(response);
    }

    return clearAdminCookie(
      redirectTo(req, "/back-office?denied=1&reason=admin_access_required")
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
    "/((?!_next/static|_next/image|favicon.ico|favicon.png).*)",
  ],
};
