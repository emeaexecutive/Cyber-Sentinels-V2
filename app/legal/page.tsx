import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function LegalPage() {
  return (
    <LegalDraftPage
      title="Legal Notices"
      subtitle="Legal notices for Cyber Sentinels policies, governance obligations and trust workflow disclaimers."
      sections={[
        ...commonLegalSections,
        {
          title: "Entity and Service Notices",
          body: "Formal company, contracting, jurisdiction and service-provider details should be added after business and legal review.",
        },
        {
          title: "Intellectual Property",
          body: "Cyber Sentinels names, marks, copy and product concepts should be treated as protected business materials subject to final legal review.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
