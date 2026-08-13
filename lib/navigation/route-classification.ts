export const productRouteStatuses = [
  "CANONICAL_PRODUCT",
  "PUBLIC_MARKETING",
  "AUTH_ACCOUNT",
  "DEVELOPER",
  "ADMIN_INTERNAL",
  "DEMO_PILOT",
  "EXPERIMENTAL",
  "LEGACY_DUPLICATE",
  "PLACEHOLDER_DEAD",
] as const;

export type ProductRouteStatus = (typeof productRouteStatuses)[number];

export type ProductRouteClassification = {
  status: ProductRouteStatus;
  rationale: string;
};

const canonicalPrefixes = [
  "/dashboard",
  "/operational-entities",
  "/trust/transactions",
  "/evidence",
  "/trust-replay",
];

const publicPrefixes = [
  "/about",
  "/about-us",
  "/accessibility",
  "/careers",
  "/corporate-sustainability",
  "/cookies",
  "/enterprise",
  "/funding",
  "/help",
  "/how-to-use",
  "/investor",
  "/journal",
  "/legal",
  "/media-centre",
  "/methodology",
  "/modern-slavery",
  "/modern-slavery-statement",
  "/operational-principles",
  "/our-people",
  "/platform",
  "/pricing",
  "/privacy",
  "/regulatory",
  "/security",
  "/solutions",
  "/sustainability",
  "/terms",
  "/transparency",
  "/trust-principles",
  "/why-now",
];

const accountPrefixes = [
  "/account",
  "/billing",
  "/data-rights",
  "/login",
  "/reset-password",
  "/team-access",
  "/team-workspace",
  "/verify-email",
];

const developerPrefixes = ["/developers", "/api-docs"];
const adminPrefixes = [
  "/admin",
  "/back-office",
  "/command-center",
  "/decision-engine",
  "/developer-console",
  "/enterprise/control-plane",
  "/enterprise/operations",
  "/evidence-vault",
  "/launch-console",
  "/launch-control",
  "/mission-control",
  "/qa-console",
  "/signals",
  "/status",
  "/trust-intelligence",
  "/trustops",
  "/verification-queue",
];
const demoPrefixes = ["/demo", "/design-partner", "/design-partners", "/pilot", "/pro-waitlist"];
const legacyPrefixes = [
  "/agent-passport",
  "/agent-registry",
  "/agents",
  "/passport",
  "/passports",
  "/replay",
  "/trust-center",
  "/trust-centre",
  "/trust-graph",
  "/trust-timeline",
  "/verification-replay",
];
const experimentalPrefixes = [
  "/ai-governance",
  "/architecture",
  "/autonomy-governance",
  "/deepfake-detection",
  "/execution-passports",
  "/global-trust",
  "/human-presence-genome",
  "/human-presence-index",
  "/intent-verification",
  "/marketplace-trust",
  "/origin-dna",
  "/origin-trace",
  "/permissions-firewall",
  "/policy-engine",
  "/reality-chain",
  "/reality-os",
  "/reality-passport",
  "/reality-twin",
  "/revocation-engine",
  "/state-verification",
  "/synthetic-counterpart",
  "/trust-algorithm",
  "/trust-evaluation-lab",
  "/trust-fabric",
  "/trust-feed",
  "/trust-graph-engine",
  "/trust-graph-explorer",
  "/trust-ledger",
  "/trust-os",
  "/trust-prediction",
  "/trust-radar",
  "/trust-recovery",
  "/trust-registry",
  "/trust-seal-authority",
  "/video-verification",
  "/workforce-trust",
];

function matches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** The single product-level classification authority for App Router pages. */
export function classifyProductRoute(pathname: string): ProductRouteClassification {
  const normalized = pathname === "" ? "/" : pathname.replace(/\/$/, "");
  if (normalized === "/") return { status: "PUBLIC_MARKETING", rationale: "Public home." };
  if (matches(normalized, canonicalPrefixes)) return { status: "CANONICAL_PRODUCT", rationale: "Primary authenticated workflow." };
  if (matches(normalized, accountPrefixes)) return { status: "AUTH_ACCOUNT", rationale: "Authentication, account, or lifecycle surface." };
  if (matches(normalized, developerPrefixes)) return { status: "DEVELOPER", rationale: "Supported developer surface." };
  if (matches(normalized, adminPrefixes)) return { status: "ADMIN_INTERNAL", rationale: "Restricted operator or internal tooling." };
  if (matches(normalized, demoPrefixes)) return { status: "DEMO_PILOT", rationale: "Controlled demonstration or pilot journey." };
  if (matches(normalized, legacyPrefixes)) return { status: "LEGACY_DUPLICATE", rationale: "Compatibility surface; not a canonical navigation destination." };
  if (matches(normalized, experimentalPrefixes)) return { status: "EXPERIMENTAL", rationale: "Non-canonical capability surface." };
  if (normalized === "/trust" || matches(normalized, publicPrefixes)) return { status: "PUBLIC_MARKETING", rationale: "Public information or marketing surface." };
  return { status: "PLACEHOLDER_DEAD", rationale: "Unclassified legacy surface; must not enter canonical navigation without an explicit rule." };
}
