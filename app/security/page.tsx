import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function SecurityPage() {
  return (
    <LegalDraftPage
      title="Security and Online Safety"
      subtitle="Cyber Sentinels is designed around proof-before-permission workflows, protected evidence handling and auditable admin review."
      sections={[
        {
          title: "Row Level Security",
          body: "Operational Supabase tables should use RLS policies and authenticated grants so direct data access is scoped to signed-in users and authorized workflows.",
        },
        {
          title: "Private Evidence Storage",
          body: "Evidence files should be stored in private buckets and accessed through controlled review flows. Public evidence exposure should require separate approval.",
        },
        {
          title: "Audit Logs",
          body: "Security-relevant activity writes audit events so passport creation, evidence review, decisions, admin access and data-rights requests can be traced.",
        },
        {
          title: "Admin Review",
          body: "Back Office and admin APIs require authenticated sessions, admin allowlist checks and a verified admin cookie before sensitive actions can be performed.",
        },
        {
          title: "Session Discipline",
          body: "Logout and session-expiry flows should clear admin state and redirect users away from protected operations when access is no longer valid.",
        },
        {
          title: "No Raw Biometric Storage",
          body: "Cyber Sentinels does not claim raw biometric storage. No raw biometric processing or storage should be implemented unless separately designed and legally reviewed.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
