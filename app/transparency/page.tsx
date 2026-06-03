import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function TransparencyPage() {
  return (
    <LegalDraftPage
      title="Transparency"
      subtitle="Cyber Sentinels provides risk-based trust assessment with evidence-backed review, human oversight and operational auditability."
      links={legalDraftLinks}
      sections={[
        {
          title: "What The Platform Does",
          body: "Cyber Sentinels helps create trust passports, collect evidence, support verification workflows, record decisions, generate audit events and provide visibility into trust relationships over time.",
        },
        {
          title: "What It Does Not Guarantee",
          body: "The platform does not guarantee fraud prevention, identity authenticity, trustworthiness, safety or full regulatory compliance. Trust scores and status labels are risk indicators that support review, not guarantees.",
        },
        {
          title: "Trust Scores",
          body: "Trust scores should be treated as risk-based indicators. They may reflect evidence, review status, signals, decisions and audit history, but they should be interpreted with context and human oversight.",
        },
        {
          title: "Evidence And Risk Basis",
          body: "Verification is evidence-backed and risk-based. Outcomes may depend on available evidence, evidence quality, review history, risk signals and administrative decisions.",
        },
        {
          title: "User Data Rights",
          body: "Users may request access, correction, deletion or export of their data through available data-rights workflows, subject to identity checks, legal obligations and operational retention requirements.",
        },
        {
          title: "Operational Auditability",
          body: "Cyber Sentinels records audit events and signals to support accountability, review and investigation. Auditability helps explain how a trust state was reached and how it changed over time.",
        },
      ]}
    />
  );
}
