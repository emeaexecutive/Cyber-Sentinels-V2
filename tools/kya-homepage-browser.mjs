import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const origin = process.env.KYA_PREVIEW_ORIGIN ?? 'http://127.0.0.1:3137';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const out = 'artifacts/kya-homepage';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const require = createRequire(import.meta.url);
const report = { origin, scope: 'Actual local Next homepage and KYA landing; no hosted Auth/SQL, pilot form submission or provider execution', cases: [], errors: [] };
try {
  for (const locale of ['en', 'es']) for (const width of [390, 1440]) for (const landing of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', e => report.errors.push(e.message));
    const prefix = locale === 'es' ? '/es' : '';
    const path = landing ? `${prefix}/platform/kya` : prefix || '/';
    const kyaPath = `${prefix}/platform/kya`;
    const name = `${locale}-${width}${landing ? '-landing' : ''}`;
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(response.status(), 200);
    await page.locator('#kya-heading').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.equal(await page.locator('main h1').count(), 1);
    assert.match(await page.title(), /KYA/);
    assert.match(await page.locator('meta[name="description"]').getAttribute('content'), locale === 'es' ? /en desarrollo|desarrollando/ : /developing/);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, new URL(path, 'https://www.cybersentinels.com').href);
    assert.equal(await page.locator('link[hreflang="es"]').getAttribute('href'), `https://www.cybersentinels.com${landing ? '/es/platform/kya' : '/es'}`);
    const reject = page.getByRole('button', { name: 'Reject Optional', exact: true });
    if (await reject.isVisible()) {
      await reject.click();
      const notice = page.getByRole('button', { name: 'Dismiss saved preferences notification', exact: true });
      await notice.waitFor({ state: 'visible', timeout: 10000 });
      await notice.click();
    }
    if (width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Abrir menú' : 'Open menu', exact: true }).click();
    const nav = page.locator('header').getByRole('link', { name: 'KYA', exact: true });
    assert.equal(await nav.getAttribute('href'), kyaPath);
    await nav.click();
    await page.waitForURL(u => u.pathname === kyaPath);
    await page.locator('main h1').waitFor();
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    const section = page.locator('#know-your-agent');
    await section.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await section.count(), 1);
    assert.match(await section.innerText(), locale === 'es' ? /En desarrollo/ : /In development/);
    assert.equal(await section.locator('figure ol > li').count(), 6);
    assert.equal(await section.locator('figure [aria-hidden="true"]').count(), 5);
    assert.equal(await section.locator('dl dt').count(), 5);
    assert.equal(await section.getAttribute('aria-labelledby'), 'kya-heading');
    assert.equal(await section.locator('#kya-heading').evaluate(e => e.tagName), landing ? 'H1' : 'H2');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const accessibility = [];
    for (const selector of ['#know-your-agent', 'header']) {
      if (selector === 'header' && width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Abrir menú' : 'Open menu', exact: true }).click();
      const result = await page.evaluate(async selector => {
        const result = await window.axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return { scope: selector, violations: result.violations, incomplete: result.incomplete, passedRules: result.passes.length };
      }, selector);
      accessibility.push(result);
      await writeFile(`${out}/${name}-accessibility.json`, JSON.stringify(accessibility, null, 2) + '\n');
      assert.deepEqual(result.violations, [], `${name} accessibility ${selector}`);
      if (selector === 'header' && width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Cerrar menú' : 'Close', exact: true }).click();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await section.screenshot({ path: `${out}/${name}-section.png` });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${out}/${name}-page.png`, fullPage: true });
    const links = await section.locator('a').evaluateAll(a => a.map(x => ({ text: x.textContent, href: x.getAttribute('href') })));
    for (const link of links) {
      const control = section.getByRole('link', { name: link.text, exact: true });
      await control.focus();
      assert.equal(await control.evaluate(e => document.activeElement === e), true);
      await page.keyboard.press('Enter');
      await page.waitForURL(u => u.pathname + u.search + u.hash === link.href);
      await page.locator('main h1').first().waitFor();
      if (link.href.includes('#agent-authority')) assert.equal(await page.locator('#agent-authority').count(), 1);
      if (link.href.includes('intent=pilot')) {
        assert.ok(await page.locator('form').count() > 0);
        assert.equal(await page.locator('main h1').innerText(), locale === 'es' ? 'Iniciar un piloto' : 'Start Pilot');
      }
      if (link.href.endsWith('/platform/kya')) assert.equal(await page.locator('#kya-heading').evaluate(e => e.tagName), 'H1');
      await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      await page.locator('#kya-heading').waitFor();
    }
    if (landing) {
      if (width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Abrir menú' : 'Open menu', exact: true }).click();
      await page.getByRole('button', { name: locale === 'es' ? /Cambiar idioma/ : /Change language/ }).click();
      await page.getByRole('button', { name: locale === 'es' ? 'English' : 'Español · sitio público', exact: true }).click();
      await page.waitForURL(u => u.pathname === (locale === 'es' ? '/platform/kya' : '/es/platform/kya'));
      assert.equal(await page.locator('html').getAttribute('lang'), locale === 'es' ? 'en' : 'es');
    }
    report.cases.push({ path, locale, width, landing, status: 'PASS', ctas: links, accessibility });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
}
