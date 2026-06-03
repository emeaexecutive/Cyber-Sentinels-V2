import { LegalDraftPage } from "@/components/legal-draft-page";
import { commonLegalSections, legalDraftLinks } from "@/lib/legal/draftPages";

const securitySections = [
  ...commonLegalSections,
  {
    title: "Encrypted Storage",
    body: "Cyber Sentinels is designed for encrypted platform storage and server-side access controls. Deployment encryption settings should be verified before any formal security claim.",
  },
  {
    title: "Private Evidence Files",
    body: "Evidence files should remain private, reviewed through controlled workflows and never exposed through public buckets unless explicitly approved.",
  },
  {
    title: "Admin Review",
    body: "Sensitive workflows such as evidence decisions, Back Office review and admin APIs require authenticated access, allowlist checks and admin verification.",
  },
  {
    title: "Audit Trail",
    body: "Security-relevant actions write audit events and signals so review history remains traceable.",
  },
  {
    title: "Row Level Security",
    body: "Operational Supabase tables use RLS and authenticated grants to limit direct database access. Policies must be reviewed before production deployment.",
  },
  {
    title: "Biometric Data",
    body: "Cyber Sentinels does not claim raw biometric storage. No raw biometric storage should be added unless explicitly designed, documented and legally reviewed.",
  },
];

export default function SecurityPage() {
  return (
    <LegalDraftPage
      title="Security and Online Safety"
      subtitle="Cyber Sentinels assumes trust actions must be authenticated, validated, logged and reviewable."
      sections={securitySections}
      links={legalDraftLinks}
    />
  );
}
