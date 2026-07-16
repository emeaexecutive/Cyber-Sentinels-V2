export const PUBLIC_API_VERSION = "v1";

export type PublicEndpointContract = {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  authentication: "Public read" | "Signed webhook" | "Rate-limited intake" | "Authenticated user";
  requestSchema: string;
  responseSchema: string;
  pagination: "limit + cursor" | "not applicable";
  audit: string;
};

export const publicEndpointContracts: PublicEndpointContract[] = [
  { method: "GET", path: "/api/health", purpose: "Minimal service liveness", authentication: "Public read", requestSchema: "No body", responseSchema: "ok, status, meta", pagination: "not applicable", audit: "Trace ID in every response" },
  { method: "GET", path: "/api/status", purpose: "Bounded deployment status", authentication: "Public read", requestSchema: "No body", responseSchema: "ok, deployment_state, warnings, integrations, meta", pagination: "not applicable", audit: "Trace ID in every response" },
  { method: "GET", path: "/api/public/verify/{id}", purpose: "Public-safe verification lookup", authentication: "Public read", requestSchema: "Path id", responseSchema: "ok, verification, meta", pagination: "not applicable", audit: "Public verification audit event + response audit ID" },
  { method: "GET", path: "/api/public/profile/{id}", purpose: "Public-safe trust profile lookup", authentication: "Public read", requestSchema: "Path id", responseSchema: "ok, profile, meta", pagination: "not applicable", audit: "Public profile audit event + response audit ID" },
  { method: "GET", path: "/api/seals/verify/{id}", purpose: "Public trust-seal verification", authentication: "Public read", requestSchema: "Path id", responseSchema: "ok, seal, meta", pagination: "not applicable", audit: "Seal verification audit event + response audit ID" },
  { method: "GET", path: "/api/embed/{id}", purpose: "Public-safe embed payload", authentication: "Public read", requestSchema: "Path id", responseSchema: "ok, embed, meta", pagination: "not applicable", audit: "Embed view audit event + response audit ID" },
  { method: "GET", path: "/api/feed/public", purpose: "Sanitized public trust feed", authentication: "Public read", requestSchema: "Query limit?: 1..50, cursor?: numeric offset", responseSchema: "ok, feed, meta.pagination", pagination: "limit + cursor", audit: "Feed access audit event + response audit ID" },
  { method: "GET", path: "/api/registry/search", purpose: "Public-safe registry search", authentication: "Public read", requestSchema: "Query query?, type?, limit?: 1..50, cursor?: numeric offset", responseSchema: "ok, results, meta.pagination", pagination: "limit + cursor", audit: "Registry search audit event + response audit ID" },
  { method: "POST", path: "/api/providers", purpose: "Hopae normalized provider callback", authentication: "Signed webhook", requestSchema: "Signed provider payload up to 256KB", responseSchema: "Provider callback result or normalized error", pagination: "not applicable", audit: "Signature, replay and provider audit controls" },
  { method: "POST", path: "/api/integrations/ats/webhook", purpose: "ATS workflow event intake", authentication: "Signed webhook", requestSchema: "Signed ATS event with idempotency identifier", responseSchema: "Normalized intake result or normalized error", pagination: "not applicable", audit: "Signature, idempotency and receipt audit controls" },
  { method: "POST", path: "/api/enterprise-access", purpose: "Enterprise access request", authentication: "Rate-limited intake", requestSchema: "Validated form payload", responseSchema: "Redirect or normalized validation error", pagination: "not applicable", audit: "Request correlation retained by intake workflow" },
  { method: "POST", path: "/api/waitlist", purpose: "Waitlist request", authentication: "Rate-limited intake", requestSchema: "Validated email payload", responseSchema: "ok or normalized validation error", pagination: "not applicable", audit: "Request correlation retained by intake workflow" },
  { method: "POST", path: "/api/support/issues", purpose: "Authenticated support intake", authentication: "Authenticated user", requestSchema: "Validated support details and optional diagnostic consent", responseSchema: "ok, issue_id or normalized error", pagination: "not applicable", audit: "Issue ID and authenticated actor retained" },
];
