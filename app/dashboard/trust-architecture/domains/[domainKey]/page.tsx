import { notFound } from "next/navigation";
import { DomainGrid } from "@/src/components/trust-architecture/TrustArchitecture";
import { isTrustDomainKey } from "@/src/lib/trust-architecture/domain-registry";
import { trustArchitectureRepository } from "@/src/lib/trust-architecture/repository";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";
export const dynamic="force-dynamic";
export default async function TrustDomainPage({params}:{params:Promise<{domainKey:string}>}){const domainKey=(await params).domainKey.toUpperCase();if(!isTrustDomainKey(domainKey))notFound();await trustArchitectureUiContext(`/dashboard/trust-architecture/domains/${domainKey}`);const domains=await trustArchitectureRepository().domains();const domain=domains.filter((item)=>item.domain_key===domainKey);if(!domain.length)notFound();return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-5xl"><p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Trust domain</p><h1 className="mt-3 text-4xl font-semibold">{String(domain[0].display_name)}</h1><p className="mt-4 text-zinc-400">{String(domain[0].description)}</p><div className="mt-8"><DomainGrid domains={domain}/></div></div></main>;}
