export type EnterpriseAction = {
  href: string;
  label: string;
};

export const enterpriseCtas = {
  requestDemo: {
    href: "/enterprise-access?intent=demo",
    label: "Request Demo",
  },
  bookPilot: {
    href: "/enterprise/pilot",
    label: "Book Pilot",
  },
  contactEnterprise: {
    href: "/enterprise-access?intent=trust-team",
    label: "Contact Enterprise",
  },
  requestControlledPilot: {
    href: "/enterprise-access?intent=pilot",
    label: "Request Controlled Pilot",
  },
  buyerDocumentation: {
    href: "/enterprise/buyer-documentation",
    label: "Buyer Documentation",
  },
  pilotChecklist: {
    href: "/enterprise/pilot-checklist",
    label: "Pilot Checklist",
  },
} as const satisfies Record<string, EnterpriseAction>;

export const enterpriseNavigation = [
  { href: "/enterprise", label: "Overview" },
  enterpriseCtas.buyerDocumentation,
  enterpriseCtas.pilotChecklist,
  { href: "/enterprise/pilot", label: "Pilot Program" },
  { href: "/enterprise/agent-governance", label: "Agent Governance" },
  { href: "/enterprise#compliance", label: "Compliance" },
  { href: "/security", label: "Security" },
  { href: "/design-partner", label: "Design Partner" },
] as const;
