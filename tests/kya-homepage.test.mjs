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
  assert.match(html, locale === 'es' ? /Modelo conceptual/ : /Conceptual model/);
  assert.ok(html.includes(`href="${prefix}/enterprise-access?intent=demo"`));
  assert.ok(html.includes(`href="${prefix}/platform#agent-authority"`));
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
