import { LegalDraftPage } from "@/components/legal-draft-page";

export default function ModernSlaveryStatementPage() {
  return (
    <LegalDraftPage
      title="Modern Slavery Statement"
      subtitle="Cyber Sentinels expects responsible, lawful and transparent operations across its product, partners and supply chain."
      sections={[
        {
          title: "Current Status",
          body: "This is a placeholder structure and not a finalized statutory modern slavery statement.",
        },
        {
          title: "Future Review",
          body: "Supply-chain scope, reporting obligations, responsible owners and review cadence should be confirmed by counsel.",
        },
      ]}
    />
  );
}
