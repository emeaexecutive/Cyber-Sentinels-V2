import Link from "next/link";

const accountAccess = [
  "Trust Passport creation",
  "Evidence uploads",
  "Verification tracking",
  "Notifications and appeals",
  "Audit-aware workflows",
];

const passportRecords = [
  "Identity information",
  "Verification status",
  "Evidence records",
  "Operational signals",
  "Audit history",
  "Review outcomes",
];

const evidenceExamples = [
  "Identity documentation",
  "Employment verification",
  "Business verification",
  "Supporting operational records",
  "Compliance documentation",
];

const reviewStates = [
  "Pending review",
  "Additional evidence requests",
  "Manual review escalation",
  "Approval",
  "Rejection",
  "Appeals handling",
];

const trustIndicators = [
  "Evidence completeness",
  "Operational consistency",
  "Verification history",
  "Review outcomes",
  "Audit coverage",
  "Relationship integrity",
];

const auditRecords = [
  "Evidence uploads",
  "Review actions",
  "Verification outcomes",
  "System events",
  "Operational changes",
];

const futureModules = [
  "Reality Signature™",
  "Trust Timeline™",
  "Agent Swarm Registry™",
  "Behavior Galaxy™",
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-400">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="text-2xl font-semibold text-zinc-100">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-zinc-400">{children}</div>
    </section>
  );
}

export default function HowToUsePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
            Draft operational guidance — requires legal review before production deployment.
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            How to Use Cyber Sentinels™
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            Cyber Sentinels™ is a trust infrastructure platform designed to help
            organisations and individuals manage evidence-backed verification
            workflows, trust operations and audit visibility through a governed
            governed trust infrastructure environment.
          </p>
        </section>

        <div className="mt-8 grid gap-6">
          <Section title="Getting Started">
            <h3 className="text-lg font-semibold text-zinc-100">
              Create Your Account
            </h3>
            <p className="mt-3">
              Create a secure Cyber Sentinels account to begin managing Trust
              Passports, evidence workflows and verification requests.
            </p>
            <p className="mt-4">Your account provides access to:</p>
            <BulletList items={accountAccess} />
          </Section>

          <Section title="Create a Trust Passport">
            <p>
              A Trust Passport™ acts as a structured trust record containing:
            </p>
            <BulletList items={passportRecords} />
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="font-medium text-zinc-100">To begin:</p>
              <ol className="mt-3 grid gap-2 text-sm text-zinc-400">
                <li>1. Navigate to Create Passport</li>
                <li>2. Complete the required details</li>
                <li>3. Submit the passport for review</li>
              </ol>
              <p className="mt-4">
                Once created, your passport becomes part of the Cyber Sentinels
                trust workflow.
              </p>
            </div>
            <Link
              href="/passport"
              className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              Create Passport
            </Link>
          </Section>

          <Section title="Upload Evidence">
            <p>Evidence may be requested to support verification workflows.</p>
            <p className="mt-4">Examples may include:</p>
            <BulletList items={evidenceExamples} />
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="font-medium text-zinc-100">To upload evidence:</p>
              <ol className="mt-3 grid gap-2 text-sm text-zinc-400">
                <li>1. Open your Trust Passport</li>
                <li>2. Navigate to Evidence Upload</li>
                <li>3. Select the relevant verification case</li>
                <li>4. Upload the requested files securely</li>
              </ol>
              <p className="mt-4">
                Evidence uploads are protected through authenticated workflows
                and private storage controls.
              </p>
            </div>
            <Link
              href="/evidence-upload"
              className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              Upload Evidence
            </Link>
          </Section>

          <Section title="Verification & Review Process">
            <p>Cyber Sentinels uses a combination of:</p>
            <BulletList
              items={[
                "Evidence-backed review",
                "Operational signals",
                "Audit tracking",
                "Human oversight",
              ]}
            />
            <p className="mt-5">Verification workflows may include:</p>
            <BulletList items={reviewStates} />
            <div className="mt-5 rounded-lg border border-amber-800 bg-amber-950/20 p-4 text-amber-100">
              <p className="font-medium">Important</p>
              <p className="mt-2">
                Cyber Sentinels does not rely solely on automated
                decision-making for high-risk trust outcomes. Human review may
                be involved in verification and governance processes.
              </p>
            </div>
          </Section>

          <Section title="Verification Confidence & Trust Events">
            <p>Trust indicators may be generated using:</p>
            <BulletList items={trustIndicators} />
            <p className="mt-5">
              Trust scores are risk indicators and operational signals only.
              They are not guarantees of identity authenticity, legitimacy or
              future behaviour.
            </p>
          </Section>

          <Section title="Audit Trails & Transparency">
            <p>
              Cyber Sentinels maintains operational audit records designed to
              support accountability, explainability, traceability and
              governance workflows.
            </p>
            <p className="mt-4">Audit logs may record:</p>
            <BulletList items={auditRecords} />
          </Section>

          <Section title="Trust Graph & Relationship Visibility">
            <p>The Trust Graph™ helps visualise relationships between:</p>
            <BulletList
              items={[
                "Passports",
                "Evidence",
                "Decisions",
                "Operational signals",
                "Governance workflows",
              ]}
            />
            <p className="mt-5">
              Graph visibility is designed to support explainability and
              operational trust analysis.
            </p>
          </Section>

          <Section title="Notifications & Appeals">
            <p>Users may receive notifications relating to:</p>
            <BulletList
              items={[
                "Verification updates",
                "Evidence requests",
                "Review outcomes",
                "Appeal responses",
                "Operational messages",
              ]}
            />
            <p className="mt-5">
              If you believe a verification outcome requires review, you may
              submit an appeal through the Appeals workflow.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/notifications"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Notifications
              </Link>
              <Link
                href="/appeals"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Appeals
              </Link>
            </div>
          </Section>

          <Section title="Data Rights & Privacy">
            <p>
              Cyber Sentinels supports user data-rights workflows including
              access requests, deletion requests, correction requests and export
              requests.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                ["/data-rights", "Data Rights"],
                ["/privacy", "Privacy Policy"],
                ["/security", "Security"],
                ["/trust-principles", "Trust Principles"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Security & Governance">
            <p>Cyber Sentinels is designed around:</p>
            <BulletList
              items={[
                "Authenticated access",
                "Role-based permissions",
                "Private evidence handling",
                "Auditability",
                "Human oversight",
                "Responsible AI assistance",
              ]}
            />
            <p className="mt-5">Future infrastructure modules may include:</p>
            <BulletList items={futureModules} />
            <p className="mt-5">
              These future modules are not yet active unless explicitly stated.
            </p>
          </Section>

          <Section title="Important Notice">
            <p>
              Cyber Sentinels provides evidence-backed operational trust
              workflows and governance tooling.
            </p>
            <p className="mt-4">The platform does not guarantee:</p>
            <BulletList
              items={[
                "Fraud prevention",
                "Identity authenticity",
                "Trustworthiness",
                "Legal compliance outcomes",
              ]}
            />
            <p className="mt-5">
              All verification and trust assessments should be understood as
              risk-based operational processes supported by human governance and
              review.
            </p>
          </Section>

          <Section title="Need Help?">
            <p>
              Visit Help, Trust Assistant or Knowledge Base, or contact the
              Cyber Sentinels support team for additional guidance.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                ["/help", "Help"],
                ["/trust-assistant", "Trust Assistant"],
                ["/knowledge-base", "Knowledge Base"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
