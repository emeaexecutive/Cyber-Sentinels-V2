import Link from "next/link";
import { StructuredData } from "@/components/search/structured-data";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID } from "@/lib/search/metadata";
import { RESOURCE_REVIEWED, RESOURCE_ROOT, type SecurityResource } from "@/lib/search/resources";

export function SecurityResourceArticle({ resource }: { resource: SecurityResource }) {
  const url = `${SITE_URL}${RESOURCE_ROOT}/${resource.slug}`;
  const breadcrumbs = [
    { name: "Cyber Sentinels", item: SITE_URL },
    { name: "Agent security", item: `${SITE_URL}${RESOURCE_ROOT}` },
    { name: resource.title, item: url },
  ];
  return <main className="operational-shell min-h-screen px-4 py-12 text-white sm:px-6 md:px-8">
    <article className="mx-auto max-w-6xl">
      <StructuredData value={{ "@context": "https://schema.org", "@graph": [
        { "@type": "TechArticle", "@id": `${url}#article`, url, headline: resource.title, description: resource.answer,
          inLanguage: "en", dateModified: RESOURCE_REVIEWED, author: { "@id": ORGANIZATION_ID }, publisher: { "@id": ORGANIZATION_ID },
          mainEntityOfPage: url, isPartOf: { "@id": WEBSITE_ID }, citation: resource.sources.map((source) => source.href) },
        { "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`, itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, ...item })) },
      ] }} />
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-cyan-200">
        <Link href="/">Cyber Sentinels</Link><span aria-hidden="true">/</span><Link href={RESOURCE_ROOT}>Agent security</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-zinc-400">{resource.title}</span>
      </nav>
      <header className="mt-8 max-w-4xl border-b border-zinc-800 pb-9">
        <p className="operational-eyebrow">Agent security · Technical resource</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{resource.title}</h1>
        <p className="mt-6 text-lg leading-8 text-zinc-200">{resource.answer}</p>
        <p className="mt-5 text-sm text-zinc-400">By Cyber Sentinels · Updated <time dateTime={RESOURCE_REVIEWED}>25 September 2026</time></p>
      </header>
      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 max-w-3xl space-y-10">
          {resource.sections.map((section) => <section key={section.id} id={section.id} className="scroll-mt-32">
            <h2 className="text-2xl font-semibold leading-8">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8 text-zinc-300">{paragraph}</p>)}
            {section.example ? <pre className="mt-5 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-black p-5 text-sm leading-7 text-cyan-100">{section.example}</pre> : null}
          </section>)}
          <section id="sources" className="border-t border-zinc-800 pt-8">
            <h2 className="text-2xl font-semibold">Sources and scope</h2>
            <ul className="mt-4 space-y-5">{resource.sources.map((source) => <li key={source.href}><a href={source.href} className="text-cyan-200 underline underline-offset-4">{source.label}</a><p className="mt-2 text-sm leading-7 text-zinc-400">{source.supports}</p></li>)}</ul>
          </section>
        </div>
        <aside className="space-y-8 border-t border-zinc-800 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <nav aria-label="On this page"><h2 className="font-semibold">On this page</h2><ul className="mt-4 space-y-4">{resource.sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-sm leading-6 text-zinc-300 underline decoration-zinc-700 underline-offset-4">{section.title}</a></li>)}</ul></nav>
          <nav aria-label="Related resources"><h2 className="font-semibold">Continue reading</h2><ul className="mt-4 space-y-4">{resource.related.map((link) => <li key={link.href}><Link href={link.href} className="text-sm leading-6 text-cyan-200 underline underline-offset-4">{link.label}</Link></li>)}</ul></nav>
        </aside>
      </div>
    </article>
  </main>;
}
