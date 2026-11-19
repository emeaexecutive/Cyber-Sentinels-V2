import { ConsentProviderList } from "@/src/components/consent/ConsentProviderList";
import { PrivacyCookiesHeading } from "@/src/components/consent/PrivacyCookiesHeading";
import { currentConsentPolicy } from "@/src/lib/consent/policy";
export default function PrivacyCookiesPage(){return <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white"><div className="mx-auto max-w-5xl"><PrivacyCookiesHeading/><div className="mt-8"><ConsentProviderList categories={currentConsentPolicy.categories}/></div></div></main>;}
