import Link from "next/link";

type LegalDraftPageProps = {
  title: string;
  subtitle: string;
  sections: Array<{ title: string; body: string }>;
  links?: Array<[string, string]>;
};

// Existing draft text stays in source for review and is never rendered publicly.
export function LegalDraftPage({ title }: LegalDraftPageProps) {
  return <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <p className="mt-5 leading-7 text-zinc-300">The content for this page is under review. An approved version has not been published.</p>
      <div id="responsible-disclosure" className="mt-6 flex flex-wrap gap-6">
        <Link href="/contact" className="text-cyan-200 underline">Contact Cyber Sentinels</Link>
        <Link href="/privacy/preferences" className="text-cyan-200 underline">Manage privacy preferences</Link>
      </div>
    </div>
  </main>;
}
