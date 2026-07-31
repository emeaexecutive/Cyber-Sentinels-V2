import type { Metadata } from "next";
import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export const metadata: Metadata = {
  title: "Legal Notices | Cyber Sentinels",
  description: "Cyber Sentinels legal notices and service information.",
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  return (
    <LegalDraftPage
      title="Legal Notices"
      subtitle="General legal notices for Cyber Sentinels, including entity, jurisdiction, contact and operational-owner information that requires counsel review before production reliance."
      sections={[
        {
          title: "Service Notice",
          body: "Cyber Sentinels provides trust operations software for identity, evidence, workflow governance and auditability. Final service descriptions require approval.",
        },
        {
          title: "Jurisdiction Placeholder",
          body: "Governing law, venue, contracting entity and regional notices must be confirmed by counsel before production use.",
        },
        {
          title: "Operational Contacts",
          body: "Company: contact@cybersentinels.ai. Security: security@cybersentinels.ai. Trust operations: trust@cybersentinels.ai. Abuse reporting: abuse@cybersentinels.ai. Privacy and legal requests should use privacy@cybersentinels.ai and legal@cybersentinels.ai once counsel approves production routing.",
        },
        {
          title: "Accountable Review",
          body: "Enterprise workflows should identify the reviewer, evidence reviewed, escalation reason, workflow reference and outcome before a trust record is treated as complete.",
        },
        {
          title: "Intellectual Property",
          body: "Cyber Sentinels names, marks, interface copy and product concepts should be treated as protected business materials subject to final legal review.",
        },
        {
          title: "No Legal Advice",
          body: "The product and these draft notices do not provide legal advice. Customers should consult qualified counsel for compliance obligations.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
