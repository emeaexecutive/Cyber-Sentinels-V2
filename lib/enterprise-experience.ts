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
  { href: "/enterprise/pilot", label: "Pilot Program" },
  enterpriseCtas.buyerDocumentation,
  enterpriseCtas.pilotChecklist,
  { href: "/enterprise/agent-governance", label: "Agent Governance" },
  { href: "/enterprise/auditability", label: "Auditability" },
  { href: "/enterprise/compliance", label: "Compliance" },
  { href: "/design-partner", label: "Design Partner" },
] as const;
