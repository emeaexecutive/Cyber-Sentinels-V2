import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function TrustPrinciplesPage() {
  return (
    <LegalDraftPage
      title="Trust Principles™"
      subtitle="Cyber Sentinels is built around AI-assisted, evidence-backed and human-governed operational trust infrastructure."
      links={legalDraftLinks}
      sections={[
        {
          title: "Human Oversight",
          body: "Important trust outcomes may involve human review, especially where risk, evidence quality or operational context requires judgment. Escalation paths, review workflows and appeal-style reviews may be used so trust assessments are not treated as purely automated conclusions.",
        },
        {
          title: "Evidence-First Verification",
          body: "Cyber Sentinels is designed around evidence-backed review. Signals can support a trust assessment, but signals alone should not determine high-risk outcomes. Evidence quality, evidence status and review history remain central to verification.",
        },
        {
          title: "Explainability",
          body: "Trust decisions should be understandable to the people operating and affected by them. The platform supports audit trails, status history and operational context so reviews can be explained without relying on opaque scoring alone.",
        },
        {
          title: "Privacy-Aware Architecture",
          body: "Cyber Sentinels favors minimal data collection, role-based access, private evidence handling, secure storage patterns and audit logging. Sensitive evidence should be handled with clear purpose, access limits and review controls.",
        },
        {
          title: "Security by Design",
          body: "The platform separates public, user and admin access. Authentication, role separation, admin protection, private evidence storage, row-level security and secure workflows are core operating assumptions for governed trust infrastructure.",
        },
        {
          title: "Responsible AI Assistance",
          body: "AI may assist with drafting, summarization or operational analysis, but it should not approve or reject users for high-risk trust outcomes. Human governance, evidence verification and auditability remain central.",
        },
        {
          title: "Trust Is Dynamic",
          body: "Trust changes over time. State verification, new evidence, behavior, decisions and audit history may change a trust assessment as conditions evolve.",
        },
        {
          title: "Reality Signature™",
          body: "Future infrastructure module — not yet active. This placeholder represents a possible future layer for structured authenticity signals and evidence-backed reality assertions.",
        },
        {
          title: "Trust Timeline™",
          body: "Future infrastructure module — not yet active. This placeholder represents a possible future layer for longitudinal trust state, evidence history and review events.",
        },
        {
          title: "Agent Swarm Registry™",
          body: "Future infrastructure module — not yet active. This placeholder represents a possible future layer for governed registration and monitoring of AI agents or coordinated workflows.",
        },
        {
          title: "Behavior Galaxy™",
          body: "Future infrastructure module — not yet active. This placeholder represents a possible future layer for behavior patterns, risk movement and relationship-aware trust assessment.",
        },
      ]}
    />
  );
}
