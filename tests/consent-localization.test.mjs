import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { consentLocale, consentText, localizedConsentCategory } from "../src/lib/consent/localization.ts";
import { currentConsentPolicy } from "../src/lib/consent/policy.ts";

test("Spanish consent locale is selected only by the /es route or exact lang query", () => {
  assert.equal(consentLocale("/privacy/preferences", "?lang=es"), "es");
  assert.equal(consentLocale("/es/privacy", ""), "es");
  assert.equal(consentLocale("/privacy", "?lang=en"), "en");
  assert.equal(consentLocale("/privacy", "?language=es"), "en");
  assert.equal(consentLocale("/privacy", "?lang=es-ES"), "en");
});

test("Spanish consent copy translates every catalogue field without changing category keys", () => {
  assert.equal(consentText("es", "acceptAll", "Accept All"), "Aceptar todo");
  assert.equal(consentText("en", "acceptAll", "Accept All"), "Accept All");
  const expectedNames = ["Esenciales", "Funcionales", "Analítica", "Mejoras de IA", "Marketing"];
  const localized = currentConsentPolicy.categories.map((category, index) => {
    const translated = localizedConsentCategory("es", category);
    assert.equal(translated.key, category.key);
    assert.equal(translated.name, expectedNames[index]);
    assert.notEqual(translated.description, category.description);
    assert.notDeepEqual(translated.purposes, category.purposes);
    assert.notEqual(translated.legalBasis, category.legalBasis);
    assert.notDeepEqual(translated.storageItems, category.storageItems);
    assert.notEqual(translated.retention, category.retention);
    assert.equal(translated.party, category.party === "FIRST_PARTY" ? "Primera parte" : "Primera y tercera parte");
    return translated;
  });
  assert.equal(localized.length, currentConsentPolicy.categories.length);
});

test("consent footer initializes from its server locale and tracks client navigation", () => {
  const component = readFileSync(new URL("../src/components/consent/ConsentPreferencesLink.tsx", import.meta.url), "utf8");
  const localization = readFileSync(new URL("../src/lib/consent/localization.ts", import.meta.url), "utf8");

  assert.match(component, /usePathname/);
  assert.match(component, /useConsentLocale\(pathname \?\? undefined, initialLocale\)/);
  assert.match(localization, /useState<ConsentLocale>\(initialLocale\)/);
  assert.match(localization, /\[pathname\]/);
});
