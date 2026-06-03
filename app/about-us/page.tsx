import { LegalDraftPage } from "@/components/legal-draft-page";

export default function AboutUsPage() {
  return (
    <LegalDraftPage
      title="About Cyber Sentinels"
      subtitle="Cyber Sentinels is a Trust OS for evidence-backed verification, operational governance and auditable decisions."
      sections={[
        {
          title: "Mission",
          body: "Cyber Sentinels helps teams connect identity, evidence, decisions, signals and audit history before trust is granted.",
        },
        {
          title: "Product Direction",
          body: "The platform is built around Trust Passports, Back Office review, Trust Graph intelligence and governed assistance workflows.",
        },
        {
          title: "Review Status",
          body: "Company descriptions, corporate claims and public positioning should be reviewed before formal publication.",
        },
      ]}
    />
  );
}
