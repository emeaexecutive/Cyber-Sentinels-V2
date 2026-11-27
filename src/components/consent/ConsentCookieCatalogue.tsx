import type { ConsentLocale } from "@/src/lib/consent/localization";
import { ConsentProviderList } from "./ConsentProviderList";
import { PrivacyCookiesHeading } from "./PrivacyCookiesHeading";
import { currentConsentPolicy } from "@/src/lib/consent/policy";

export function ConsentCookieCatalogue({ locale }: { locale: ConsentLocale }) {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white">
      <div className="mx-auto max-w-5xl">
        <PrivacyCookiesHeading locale={locale} />
        <div className="mt-8">
          <ConsentProviderList categories={currentConsentPolicy.categories} locale={locale} />
        </div>
      </div>
    </main>
  );
}
