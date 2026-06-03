import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

export default function TermsPage() {
  return (
    <LegalDraftPage
      title="Terms and Conditions"
      subtitle="These draft terms outline expected use of Cyber Sentinels trust workflows, evidence review and operational dashboards."
      sections={[
        ...commonLegalSections,
        {
          title: "Acceptable Use",
          body: "Users should submit accurate information, avoid fraudulent evidence and use trust workflows only for authorized verification purposes.",
        },
        {
          title: "No Automated Outcome Warranty",
          body: "Trust scores, signals and graph summaries are decision-support tools. They should not be treated as guaranteed legal, employment or compliance determinations.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
