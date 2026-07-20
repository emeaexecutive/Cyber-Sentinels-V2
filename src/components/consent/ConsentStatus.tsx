import { consentCategoryKeys, type ConsentChoices } from "@/src/lib/consent/types";
import { privacyLevel } from "@/src/lib/consent/policy";

const labels = { essential: "Essential Security", functional: "Functional", analytics: "Analytics", ai_improvements: "AI Improvements", marketing: "Marketing" };
export function ConsentStatus({ choices }: { choices: ConsentChoices }) { return <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><h2 className="text-lg font-semibold text-white">Privacy status</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{consentCategoryKeys.map((key) => <p key={key} className="text-sm text-zinc-300"><span className="text-zinc-500">{labels[key]}:</span> {choices[key] ? "Enabled" : "Disabled"}</p>)}<p className="text-sm text-zinc-300"><span className="text-zinc-500">Privacy Level:</span> {privacyLevel(choices)}</p></div><p className="mt-3 text-xs text-zinc-500">Informational only—not a legal or security score or guarantee.</p></section>; }
