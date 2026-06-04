import { LegalDraftPage } from "@/components/legal-draft-page";
import { legalDraftLinks } from "@/lib/legal/draftPages";

export default function PrivacyPage() {
  return (
    <LegalDraftPage
      title="Privacy Policy"
      subtitle="This draft explains how Cyber Sentinels expects to handle account, passport, evidence, audit and signal data across governed trust workflows."
      sections={[
        {
          title: "Account Data",
          body: "Cyber Sentinels may process account identifiers such as user ID, email address, display name, authentication session data and admin access state to operate protected workflows.",
        },
        {
          title: "Passport Data",
          body: "Trust Passport records may include subject names, subject types, verification status, trust scores, workflow timestamps and related review context submitted by users or admins.",
        },
        {
          title: "Evidence Files",
          body: "Evidence files and file metadata are used to support verification decisions. Evidence should remain private and access-controlled unless a separate approved publication workflow is introduced.",
        },
        {
          title: "Audit Logs and Signals",
          body: "Cyber Sentinels records audit events and signals to make verification activity traceable, explainable and reviewable by authorized users.",
        },
        {
          title: "Cookies",
          body: "Essential cookies may be used for authentication, session handling, admin verification and security. Optional analytics cookies should not be enabled without preference controls.",
        },
        {
          title: "Retention",
          body: "Retention periods should be defined by customer policy, contractual requirements and legal review. Data should be retained only as long as needed for trust, audit and compliance purposes.",
        },
        {
          title: "Data Rights",
          body: "Users may request access, deletion, correction, export, objection or restriction through the Data Rights page. Requests may require identity and authorization checks.",
        },
        {
          title: "Subprocessors",
          body: "Infrastructure and service subprocessors should be documented before production use, including hosting, database, storage, authentication and email providers where applicable.",
        },
        {
          title: "Contact",
          body: "Privacy contacts, legal entity details and response timelines are placeholders until reviewed and approved by counsel.",
        },
      ]}
      links={legalDraftLinks}
    />
  );
}
