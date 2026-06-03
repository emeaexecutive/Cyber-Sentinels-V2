import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function LegalPage() {
  return (
    <LegalDraftPage
      title="Legal Notices"
      subtitle="General legal notices for Cyber Sentinels, including draft entity, jurisdiction and contact placeholders."
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
          title: "Contact Placeholder",
          body: "Legal and privacy contact addresses should be published after operational owners, mailbox routing and response obligations are confirmed.",
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
