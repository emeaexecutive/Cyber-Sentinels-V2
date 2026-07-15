import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";

export type PublicPageAdoptionContract = {
  route: (typeof canonicalPublicRoutes)[number];
  audience: string;
  problem: string;
  differentiation: string;
  primary: { href: string; label: string };
  supporting: { href: string; label: string };
};

const enterprisePrimary = { href: "/enterprise-access?intent=demo", label: "Request Demo" } as const;
const enterpriseSupporting = { href: "/enterprise/pilot", label: "Book Pilot" } as const;

const routeOverrides: Partial<Record<(typeof canonicalPublicRoutes)[number], Partial<PublicPageAdoptionContract>>> = {
  "/": {
    audience: "Security, technology and risk leaders adopting intelligent systems.",
    problem: "Critical actions lose accountable trust context after authentication.",
    differentiation: "Cyber Sentinels connects identity, authority, evidence, decisions, Replay and Trust Memory across the operational lifecycle.",
  },
  "/platform": {
    audience: "CIOs, CTOs, security architects and platform owners.",
    problem: "Trust controls are fragmented across identity, provider and workflow systems.",
    differentiation: "Enterprise Trust Fabric provides one vendor-agnostic control layer without replacing systems of record.",
  },
  "/solutions": {
    audience: "Leaders responsible for regulated and consequential workflows.",
    problem: "Human and machine actions need evidence-backed controls beyond initial access.",
    differentiation: "One operational trust lifecycle applies across humans, AI agents, machine identities and regulated workflows.",
  },
  "/trust": {
    audience: "CISOs, compliance teams, auditors and investigators.",
    problem: "Decision evidence, authority and limitations are difficult to reconstruct.",
    differentiation: "Replayable decisions and downloadable Trust Evidence Packs keep proof and uncertainty explicit.",
  },
  "/enterprise": {
    audience: "Enterprise buyers evaluating deployment, governance and adoption.",
    problem: "Buying teams need one shared path from security review to controlled pilot.",
    differentiation: "Role-specific journeys converge on the same evidence-backed pilot and production gates.",
  },
  "/pricing": {
    audience: "Enterprise sponsors and procurement teams.",
    problem: "Commercial scope is hard to assess before workflow, evidence and deployment boundaries are agreed.",
    differentiation: "Pilot scope is defined around one consequential workflow and measurable acceptance evidence.",
  },
  "/developers": {
    audience: "Developers and enterprise integration teams.",
    problem: "Trust evidence and policy checks must integrate without coupling to one provider.",
    differentiation: "Normalized APIs and replaceable adapters preserve authority, Replay and governance context.",
  },
  "/developers/docs": {
    audience: "Engineers implementing Cyber Sentinels workflows.",
    problem: "Teams need explicit contracts, failure behavior and evidence boundaries.",
    differentiation: "Documentation keeps provider state, authorization and operational limitations inspectable.",
  },
  "/developers/authentication": {
    audience: "Identity, security and application engineers.",
    problem: "Authentication alone does not prove authority for a consequential action.",
    differentiation: "Identity is evaluated with authority, evidence, runtime context and policy before execution.",
  },
  "/security": {
    audience: "Security reviewers, CISOs and enterprise risk owners.",
    problem: "Deployment controls need evidence before a pilot can handle sensitive workflows.",
    differentiation: "Protected access, RLS, audit logging and explicit readiness blockers remain reviewable.",
  },
};

function defaultContract(route: (typeof canonicalPublicRoutes)[number]): PublicPageAdoptionContract {
  const legalOrCompany = /^(\/about|\/careers|\/media-centre|\/accessibility|\/privacy|\/terms|\/cookies|\/legal|\/modern-slavery|\/help|\/journal|\/methodology|\/regulatory)/.test(route);
  return {
    route,
    audience: legalOrCompany
      ? "Enterprise stakeholders completing company, policy or assurance review."
      : "Enterprise security, technology, compliance and operational owners.",
    problem: legalOrCompany
      ? "Buying teams need clear company, policy and operating boundaries before adoption."
      : "Consequential human and machine actions need accountable evidence beyond access.",
    differentiation: legalOrCompany
      ? "Cyber Sentinels keeps organizational commitments separate from product and provider claims."
      : "Cyber Sentinels links identity, authority, evidence, decisions, Replay and Trust Memory in one governed record.",
    primary: enterprisePrimary,
    supporting: enterpriseSupporting,
  };
}

export const publicPageAdoptionAudit: PublicPageAdoptionContract[] = canonicalPublicRoutes.map((route) => ({
  ...defaultContract(route),
  ...routeOverrides[route],
  route,
  primary: routeOverrides[route]?.primary ?? enterprisePrimary,
  supporting: routeOverrides[route]?.supporting ?? enterpriseSupporting,
}));

export function publicPageAdoptionFor(pathname: string) {
  return publicPageAdoptionAudit.find((item) => item.route === pathname) ?? null;
}
