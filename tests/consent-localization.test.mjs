import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { consentLocale, consentText, localizedConsentCategory } from "../src/lib/consent/localization.ts";

test("Spanish consent locale is selected only by the /es route or exact lang query", () => {
  assert.equal(consentLocale("/privacy/preferences", "?lang=es"), "es");
  assert.equal(consentLocale("/es/privacy", ""), "es");
  assert.equal(consentLocale("/privacy", "?lang=en"), "en");
  assert.equal(consentLocale("/privacy", "?language=es"), "en");
  assert.equal(consentLocale("/privacy", "?lang=es-ES"), "en");
});

test("Spanish consent copy translates presentation without changing category keys", () => {
  assert.equal(consentText("es", "acceptAll", "Accept All"), "Aceptar todo");
  assert.equal(consentText("en", "acceptAll", "Accept All"), "Accept All");
  assert.deepEqual(localizedConsentCategory("es", "analytics", "Analytics", "English description"), {
    name: "Analítica",
    description: "Mide el uso y el rendimiento anónimos del producto para mejorar el servicio.",
  });
});

test("consent footer initializes from its server locale and tracks client navigation", () => {
  const component = readFileSync(new URL("../src/components/consent/ConsentPreferencesLink.tsx", import.meta.url), "utf8");
  const localization = readFileSync(new URL("../src/lib/consent/localization.ts", import.meta.url), "utf8");

  assert.match(component, /usePathname/);
  assert.match(component, /useConsentLocale\(pathname \?\? undefined, initialLocale\)/);
  assert.match(localization, /useState<ConsentLocale>\(initialLocale\)/);
  assert.match(localization, /\[pathname\]/);
});
