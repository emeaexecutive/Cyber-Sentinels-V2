// Public transport exceptions contain no customer operational read surface.
// Provider/machine requests retain their independent signature/API-key checks.
const publicReads = new Set([
  "/api/health", "/api/ready", "/api/auth/turnstile",
  "/api/consent", "/api/consent/cookies", "/api/consent/catalogue", "/api/consent/policy",
]);
const publicPosts = new Set([
  "/api/auth/logout", "/api/auth/password-reset/request",
  "/api/auth/password-reset/complete",
  "/api/enterprise-access", "/api/waitlist",
  // Browser privacy choices are an independent subject-bound transport.
  "/api/consent", "/api/consent/cookies", "/api/consent/withdraw",
]);
const signedCallbacks = new Set([
  "/api/providers", "/api/providers/hopae/callback",
  "/api/providers/world-id/callback", "/api/stripe/webhook",
  "/api/stripe/identity/webhook", "/api/integrations/ats/webhook",
]);

export function approvalBoundary(pathname: string, method: string):
  "PUBLIC_TRANSPORT" | "SIGNED_CALLBACK" | "API_KEY" | "CUSTOMER" {
  if (["GET", "HEAD"].includes(method) && publicReads.has(pathname)) return "PUBLIC_TRANSPORT";
  if (method === "POST" && publicPosts.has(pathname)) return "PUBLIC_TRANSPORT";
  if (method === "PATCH" && pathname === "/api/consent") return "PUBLIC_TRANSPORT";
  if (method === "POST" && (signedCallbacks.has(pathname) || /^\/api\/trust-events\/ingest\/[^/]+$/.test(pathname))) return "SIGNED_CALLBACK";
  if (pathname === "/api/v1" || pathname.startsWith("/api/v1/")) return "API_KEY";
  return "CUSTOMER";
}

export function isTenantAdminSurface(pathname: string) {
  return pathname === "/admin/consent" ||
    ["/api/admin/consent/", "/admin/consensus", "/api/admin/consensus/", "/admin/trust-architecture", "/api/admin/trust-architecture/"].some(prefix => pathname.startsWith(prefix));
}
