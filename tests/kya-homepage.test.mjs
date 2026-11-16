import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { harness } from './fixtures/sign-out-session.mjs';

for (const locale of ['en', 'es']) test(`KYA homepage ${locale} stays conceptual and has localized working destinations`, async () => {
  const h = harness({ locale });
  const { default: Home, generateMetadata } = h.load('app/page.tsx');
  const html = renderToStaticMarkup(await Home());
  const prefix = locale === 'es' ? '/es' : '';
  assert.equal((html.match(/id="know-your-agent"/g) ?? []).length, 1);
  assert.match(html, locale === 'es' ? /En desarrollo/ : /In development/);
  assert.match(html, locale === 'es' ? /Flujo conceptual/ : /Conceptual flow/);
  assert.match(html, /Cyber Sentinels KYA™/);
  assert.ok(html.includes(`href="${prefix || '/'}#kya-capabilities"`));
  assert.ok(html.includes(`href="${prefix}/platform#agent-authority"`));
  if (locale === 'en') {
    for (const text of ["Know Your AI Agent", "Knowing who an AI agent is doesn&#x27;t mean knowing what it&#x27;s authorised to do.", "But identity alone is not enough.", "Through TENENTE™, our vision extends beyond agent identity towards accountable, policy-governed execution.", "KYC verifies the customer.", "KYA verifies the agent.", "Cyber Sentinels verifies the authority to act.", "Authority can be delegated. It cannot be invented.™", "IDENTIFY", "VERIFY", "AUTHORISE", "ENFORCE", "PROVE"]) assert.ok(html.includes(text), text);
  } else {
    for (const text of ["Conoce a tu agente de IA", "Saber quién es un agente de IA no significa saber qué está autorizado a hacer.", "IDENTIFICAR", "VERIFICAR", "AUTORIZAR", "APLICAR CONTROLES", "DEMOSTRAR", "La autoridad puede delegarse. No puede inventarse.™"]) assert.ok(html.includes(text), text);
  }
  const { localizedPublicHref } = h.load('lib/i18n/public-locales.ts');
  assert.equal(localizedPublicHref('/#know-your-agent', locale), `${prefix}/#know-your-agent`.replace('/es/#', '/es#'));
  const metadata = await generateMetadata();
  assert.match(metadata.title, /KYA/);
  assert.match(metadata.description, locale === 'es' ? /en desarrollo/ : /developing/);
  assert.equal(metadata.alternates.canonical, prefix || '/');
  assert.equal(metadata.alternates.languages.en, '/');
  assert.equal(metadata.alternates.languages.es, '/es');
  assert.equal(metadata.openGraph.url, `https://www.cybersentinels.com${prefix}`);
});
