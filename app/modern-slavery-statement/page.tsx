import { LegalDraftPage } from "@/components/legal-draft-page";

export default function ModernSlaveryStatementPage() {
  return (
    <LegalDraftPage
      title="Modern Slavery Statement"
      subtitle="Cyber Sentinels expects responsible, lawful and transparent operations across its product, partners and supply chain."
      sections={[
        {
          title: "Current Status",
          body: "This page is a placeholder structure and is not a finalized statutory modern slavery statement.",
        },
        {
          title: "Supply Chain",
          body: "Supplier scope, due diligence procedures, risk assessment, training and reporting obligations should be confirmed before publication.",
        },
        {
          title: "Responsible Operations",
          body: "Cyber Sentinels intends to support human-governed, auditable trust infrastructure while avoiding claims that have not been reviewed.",
        },
      ]}
    />
  );
}
