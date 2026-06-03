import { LegalDraftPage } from "@/components/legal-draft-page";

export default function CorporateSustainabilityPage() {
  return (
    <LegalDraftPage
      title="Corporate Sustainability"
      subtitle="Cyber Sentinels is designed to support responsible, auditable and human-governed trust infrastructure."
      sections={[
        {
          title: "Responsible Operations",
          body: "Sustainability commitments should be specific, measurable and reviewed before public use.",
        },
        {
          title: "Trust Infrastructure",
          body: "The product direction emphasizes accountable workflows, evidence-backed decisions and human governance.",
        },
      ]}
    />
  );
}
