export type RouteVisibility =
  | "public"
  | "authenticated"
  | "admin"
  | "internal"
  | "archived"
  | "deprecated";

export type RouteVisibilityRecord = {
  route: string;
  visibility: RouteVisibility;
  canonical?: string;
  indexable: boolean;
  reason: string;
};

export type RouteSurfaceManifestEntry = RouteVisibilityRecord & {
  family: "public" | "authenticated" | "admin" | "internal" | "archived" | "deprecated";
};

export const routeSurfaceManifest: RouteSurfaceManifestEntry[] = [
  { route: "/", visibility: "public", family: "public", indexable: true, reason: "Canonical public homepage." },
  { route: "/platform", visibility: "public", family: "public", indexable: true, reason: "Primary product platform narrative." },
  { route: "/solutions", visibility: "public", family: "public", indexable: true, reason: "Workflow outcome framing for buyers." },
  { route: "/trust", visibility: "public", family: "public", indexable: true, reason: "Canonical public trust narrative." },
  { route: "/enterprise", visibility: "public", family: "public", indexable: true, reason: "Canonical enterprise story and deployment path." },
  { route: "/pricing", visibility: "public", family: "public", indexable: true, reason: "Commercial entry point for buyer conversations." },
  { route: "/developers", visibility: "public", family: "public", indexable: true, reason: "Developer entry point for the public contract." },
  { route: "/developers/docs", visibility: "public", family: "public", indexable: true, reason: "Public API documentation reference." },
  { route: "/developers/authentication", visibility: "public", family: "public", indexable: true, reason: "Public integration authentication guidance." },
  { route: "/documents", visibility: "public", family: "public", indexable: true, reason: "Public documents and evidence library entry." },
  { route: "/documents/operational-trust-whitepaper", visibility: "public", family: "public", indexable: true, reason: "Canonical public whitepaper route." },
  { route: "/dashboard", visibility: "authenticated", family: "authenticated", indexable: false, reason: "Authenticated workspace landing page." },
  { route: "/trust-center", visibility: "authenticated", family: "authenticated", indexable: false, reason: "Authenticated trust operations surface." },
  { route: "/trust-replay", visibility: "authenticated", family: "authenticated", indexable: false, reason: "Authenticated replay experience." },
  { route: "/admin", visibility: "admin", family: "admin", indexable: false, reason: "Protected administrator surface." },
  { route: "/architecture", visibility: "internal", family: "internal", indexable: false, reason: "Internal engineering and architecture surface." },
  { route: "/agent-passport", visibility: "archived", family: "archived", indexable: false, reason: "Archived experimental route." },
  { route: "/reality-twin", visibility: "archived", family: "archived", indexable: false, reason: "Archived concept route." },
  { route: "/about-us", visibility: "deprecated", family: "deprecated", indexable: false, reason: "Deprecated duplicate of the about page." },
  { route: "/trust-os", visibility: "deprecated", family: "deprecated", indexable: false, reason: "Deprecated duplicate of the platform narrative." },
];

export const canonicalPublicRoutes = [
  "/",
  "/platform",
  "/solutions",
  "/trust",
  "/trust/data-sovereignty",
  "/verification-replay",
  "/enterprise",
  "/enterprise/agent-governance",
  "/enterprise/buyer-documentation",
  "/enterprise/hiring-security",
  "/enterprise/pilot",
  "/enterprise/pilot-checklist",
  "/developers",
  "/developers/docs",
  "/developers/authentication",
  "/documents",
  "/documents/operational-trust-whitepaper",
  "/pricing",
  "/methodology",
  "/journal",
  "/regulatory",
  "/media-centre",
  "/about",
  "/about/mission",
  "/our-people",
  "/careers",
  "/enterprise-access",
  "/help",
  "/accessibility",
  "/privacy",
  "/terms",
  "/cookies",
  "/legal",
  "/modern-slavery",
  "/security",
] as const;

export const redirectedPublicRoutes: RouteVisibilityRecord[] = [
  { route: "/about-us", visibility: "deprecated", canonical: "/about", indexable: false, reason: "Duplicate company overview." },
  { route: "/design-partners", visibility: "deprecated", canonical: "/design-partner", indexable: false, reason: "Duplicate design-partner entry." },
  { route: "/modern-slavery-statement", visibility: "deprecated", canonical: "/modern-slavery", indexable: false, reason: "Duplicate legal statement." },
  { route: "/trust-posture", visibility: "deprecated", canonical: "/trust#trust-posture", indexable: false, reason: "Public posture explanation is owned by Trust Center." },
  { route: "/reality-os", visibility: "deprecated", canonical: "/platform", indexable: false, reason: "Legacy product framing." },
  { route: "/trust-os", visibility: "deprecated", canonical: "/platform", indexable: false, reason: "Legacy product framing." },
  { route: "/trust-fabric", visibility: "deprecated", canonical: "/platform#trust-fabric", indexable: false, reason: "Enterprise Trust Fabric is owned by Platform." },
] as const;

export const protectedRoutePrefixes = [
  "/admin",
  "/back-office",
  "/dashboard",
  "/workspace",
  "/trust-center",
  "/trust-replay",
  "/replay",
  "/verification/receipt",
  "/developers/api-keys",
  "/agents",
  "/passports",
  "/passport",
  "/enterprise/pilot-setup",
] as const;

export const internalRoutePrefixes = [
  "/architecture",
  "/command-center",
  "/demo-lab",
  "/developer-console",
  "/launch-console",
  "/launch-control",
  "/mission-control",
  "/qa-console",
  "/trust-graph-engine",
  "/trust-intelligence",
  "/trust-prediction",
  "/verification-queue",
] as const;

export const archivedRoutePrefixes = [
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
  "/reality-passport",
  "/reality-twin",
  "/revocation-engine",
  "/step-up-verification",
  "/synthetic-counterpart",
  "/trust-algorithm",
  "/trust-badges",
  "/trust-embeds",
  "/trust-evaluation-lab",
  "/trust-feed",
  "/trust-graph",
  "/trust-graph-explorer",
  "/trust-ledger",
  "/trust-radar",
  "/trust-recovery",
  "/trust-registry",
  "/trust-seal-authority",
  "/trust-timeline",
  "/video-verification",
] as const;

export function routeMatchesPrefix(route: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

export function isIndexablePublicRoute(route: string) {
  return canonicalPublicRoutes.includes(route as (typeof canonicalPublicRoutes)[number]);
}
