export type CanonicalNavigationItem = { href: string; label: string; access: "public" | "authenticated" | "admin" };

export const canonicalNavigation = {
  public: [
    { href: "/platform", label: "Platform", access: "public" },
    { href: "/solutions", label: "Solutions", access: "public" },
    { href: "/trust", label: "Trust", access: "public" },
    { href: "/enterprise", label: "Enterprise", access: "public" },
    { href: "/pricing", label: "Pricing", access: "public" },
    { href: "/login", label: "Sign In", access: "public" },
  ],
  authenticated: [
    { href: "/dashboard", label: "Overview", access: "authenticated" },
    { href: "/operational-entities", label: "Operational Entities", access: "authenticated" },
    { href: "/trust/transactions", label: "Decisions / Transactions", access: "authenticated" },
    { href: "/evidence", label: "Evidence", access: "authenticated" },
    { href: "/trust-replay", label: "Replay", access: "authenticated" },
    { href: "/developers", label: "Developers", access: "authenticated" },
    { href: "/account", label: "Account", access: "authenticated" },
  ],
  admin: [{ href: "/admin/access", label: "Administration", access: "admin" }],
  trustCentre: [
    { href: "/trust-centre", label: "Trust Centre", access: "authenticated" },
    { href: "/trust-centre/fabric", label: "Enterprise Trust Fabric", access: "authenticated" },
    { href: "/trust-replay", label: "Replay", access: "authenticated" },
  ],
  dashboard: [
    { href: "/dashboard", label: "Overview", access: "authenticated" },
    { href: "/operational-entities", label: "Operational Entities", access: "authenticated" },
    { href: "/trust/transactions", label: "Decisions / Transactions", access: "authenticated" },
    { href: "/evidence", label: "Evidence", access: "authenticated" },
    { href: "/trust-replay", label: "Replay", access: "authenticated" },
    { href: "/developers", label: "Developers", access: "authenticated" },
    { href: "/account", label: "Account", access: "authenticated" },
  ],
  governance: [{ href: "/dashboard/governance", label: "Governance", access: "authenticated" }],
  environmentScope: [{ href: "/dashboard/environment-scope", label: "Environment & Scope", access: "authenticated" }],
  seriousIncidents: [{ href: "/dashboard/serious-incidents", label: "Serious Incidents", access: "authenticated" }],
  regulatoryReadiness: [{ href: "/dashboard/regulatory-readiness", label: "Regulatory Readiness", access: "authenticated" }],
  replay: [{ href: "/trust-replay", label: "Replay", access: "authenticated" }],
  trustFabric: [{ href: "/trust-centre/fabric", label: "Trust Fabric", access: "authenticated" }],
  productCapabilities: [
    { href: "/platform#trust-fabric", label: "Enterprise Trust Fabric", access: "public" },
    { href: "/trust#trust-memory", label: "Trust Memory", access: "public" },
    { href: "/demo", label: "Demo", access: "public" },
  ],
} as const satisfies Record<string, readonly CanonicalNavigationItem[]>;

export const publicHeaderLinks = canonicalNavigation.public;
