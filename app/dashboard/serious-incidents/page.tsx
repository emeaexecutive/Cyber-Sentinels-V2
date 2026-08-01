import { SeriousIncidentRegulatoryPanel } from "@/src/components/serious-incident/SeriousIncidentRegulatoryPanel";
import { seriousIncidentScenario } from "@/src/lib/serious-incident/scenarios";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";

export const dynamic = "force-dynamic";
export default async function SeriousIncidentsPage() { const { workspace } = await trustArchitectureUiContext("/dashboard/serious-incidents"); if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">Enterprise workspace required.</main>; const scenario=seriousIncidentScenario(); return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-7xl"><SeriousIncidentRegulatoryPanel {...scenario} /></div></main>; }
