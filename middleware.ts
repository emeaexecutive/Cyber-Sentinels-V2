import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isIndexablePublicRoute } from "@/lib/navigation/route-visibility";
import {
  getAdminEmailsEnv,
  getPublicSupabaseEnv,
  hasPublicSupabaseEnv,
} from "@/lib/env";
import { isMissingAuthSessionError } from "@/lib/supabase/auth-errors";
import { isPasswordRecoverySession, isRecoveryWorkflowPath, PASSWORD_RECOVERY_COOKIE, PASSWORD_RECOVERY_PATH } from "@/lib/auth/password-recovery";

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
  "/trust-centre",
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
  "/enterprise/operations",
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
  const refreshedCookies: CookieToSet[] = [];
  const refreshedHeaders = new Headers();
  const finish = (response: NextResponse) => {
    // Indexing policy only: never bypass or replace the existing auth checks.
    const isSearchAsset = pathname === "/robots.txt" || pathname === "/sitemap.xml" || pathname.startsWith("/_next/")
      || pathname === "/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf";
    if (!isSearchAsset && !isIndexablePublicRoute(pathname)) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    for (const { name, value, options } of refreshedCookies) {
      if (!response.cookies.has(name)) response.cookies.set(name, value, options);
    }
    refreshedHeaders.forEach((value, name) => response.headers.set(name, value));
    return response;
  };
  // Supabase can fall back to Site URL when an old email redirect is disallowed.
  if (pathname === "/" && req.nextUrl.searchParams.has("code")) {
    return redirectTo(req, `/auth/callback${search}`);
  }
  // Run before every public-route/provider/admin exception. A deleted marker
  // must not turn a recovery JWT into an ordinary application session.
  const recoveryMutation = ["/api/auth/password-reset/request", "/api/auth/password-reset/complete", "/api/auth/logout"].includes(pathname);
  if (!isRecoveryWorkflowPath(pathname) || (!["GET", "HEAD"].includes(req.method) && !recoveryMutation)) {
    let recovery = req.cookies.has(PASSWORD_RECOVERY_COOKIE);
    const bearer = req.headers.get("authorization")?.match(/^Bearer (ey[^ ]+\.[^ ]+\.[^ ]+)$/i)?.[1];
    const hasSessionCookie = req.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token") && !name.includes("code-verifier"));
    if (bearer || hasSessionCookie) {
      if (!hasPublicSupabaseEnv()) return protectedSurfaceUnavailable();
      const env = getPublicSupabaseEnv("recovery quarantine");
      const auth = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (items: CookieToSet[], headers: Record<string, string>) => {
            items.forEach((item) => req.cookies.set(item.name, item.value));
            refreshedCookies.push(...items);
            Object.entries(headers).forEach(([name, value]) => refreshedHeaders.set(name, value));
          },
        },
      });
      try {
        const cookieResult = hasSessionCookie ? await auth.auth.getClaims() : null;
        const bearerResult = bearer ? await auth.auth.getClaims(bearer) : null;
        if (cookieResult?.error || bearerResult?.error) return finish(protectedSurfaceUnavailable());
        recovery = isPasswordRecoverySession(cookieResult?.data?.claims) ||
          isPasswordRecoverySession(bearerResult?.data?.claims) ||
          (recovery && !cookieResult?.data?.claims);
        if (cookieResult?.data?.claims) {
          if (!recovery && req.cookies.has(PASSWORD_RECOVERY_COOKIE)) {
            // A fresh ordinary login supersedes an abandoned recovery marker.
            refreshedCookies.push({ name: PASSWORD_RECOVERY_COOKIE, value: "", options: { path: "/", maxAge: 0 } });
          }
        }
      } catch { return finish(protectedSurfaceUnavailable()); }
    }
    if (recovery) {
      return finish(pathname.startsWith("/api/")
        ? preventIndexing(NextResponse.json({ error: "PASSWORD_RECOVERY_REQUIRED" }, { status: 403 }))
        : redirectTo(req, PASSWORD_RECOVERY_PATH));
    }
  }
  return finish(await applicationMiddleware(req));
}

async function applicationMiddleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Provider callbacks authenticate with a timestamped HMAC in the route.
  // Browser GET access to the provider registry remains session-protected.
  if (
    req.method === "POST" &&
    ([
      "/api/providers",
      "/api/providers/hopae/callback",
      "/api/providers/world-id/callback",
    ].includes(pathname) || pathname.startsWith("/api/trust-events/ingest/"))
  ) {
    return NextResponse.next();
  }
  // Enterprise consent-admin APIs authorize workspace owner/admin roles in the
  // route and are not restricted to the platform-wide founder allowlist.
  if (pathname === "/admin/consent" || pathname.startsWith("/api/admin/consent/")) return NextResponse.next();
  if (pathname.startsWith("/admin/consensus") || pathname.startsWith("/api/admin/consensus/")) return NextResponse.next();
  if (pathname.startsWith("/admin/trust-architecture") || pathname.startsWith("/api/admin/trust-architecture/")) return NextResponse.next();
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
        setAll(cookiesToSet: CookieToSet[], headers: Record<string, string>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
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
