import { LegalDraftPage } from "@/components/legal-draft-page";

export default function CorporateSustainabilityPage() {
  return (
    <LegalDraftPage
      title="Corporate Sustainability"
      subtitle="Cyber Sentinels is designed to support responsible, auditable and human-governed trust infrastructure."
      sections={[
        {
          title: "Responsible Trust Infrastructure",
          body: "The product direction emphasizes accountable workflows, evidence-backed decisions and human governance for sensitive trust operations.",
        },
        {
          title: "Operational Sustainability",
          body: "Sustainability commitments should be specific, measurable and reviewed before public use.",
        },
        {
          title: "Future Reporting",
          body: "Environmental, social and governance reporting should be added only when ownership, methodology and review cadence are confirmed.",
        },
      ]}
    />
  );
}
