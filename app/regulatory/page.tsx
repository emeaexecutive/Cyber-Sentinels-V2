import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function RegulatoryPage() {
  return (
    <LegalDraftPage
      title="Regulatory"
      subtitle="Cyber Sentinels supports evidence review, auditability and trust traceability. Regulatory configuration depends on jurisdiction and customer use case."
      sections={[
        ...commonLegalSections,
        {
          title: "No Formal Compliance Claim",
          body: "This draft does not claim SOC 2, ISO, GDPR, HIPAA, biometric or sector-specific compliance unless separately verified and documented.",
        },
        {
          title: "Governance Readiness",
          body: "Audit trails, RLS, admin review and data-rights workflows are intended to support future compliance review.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
