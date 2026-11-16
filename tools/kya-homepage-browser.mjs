import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.KYA_PREVIEW_ORIGIN ?? 'http://127.0.0.1:3137';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const out = 'artifacts/kya-homepage';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { origin, scope: 'Actual local Next website; no hosted Auth, SQL, forms submitted or provider execution', cases: [], errors: [] };
try {
  for (const locale of ['en', 'es']) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', e => report.errors.push(e.message));
    const path = locale === 'es' ? '/es' : '/';
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
    assert.equal(response.status(), 200);
    await page.locator('#kya-heading').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.match(await page.title(), /KYA/);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, new URL(path, 'https://www.cybersentinels.com').href);
    assert.equal(await page.locator('link[hreflang="es"]').getAttribute('href'), 'https://www.cybersentinels.com/es');
    const reject = page.getByRole('button', { name: 'Reject Optional', exact: true });
    if (await reject.isVisible()) {
      await reject.click();
      const notice = page.getByRole('button', { name: 'Dismiss saved preferences notification', exact: true });
      await notice.waitFor({ state: 'visible', timeout: 10000 });
      await notice.click();
    }
    if (width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Abrir menú' : 'Open menu', exact: true }).click();
    await page.locator('header').getByRole('link', { name: 'KYA', exact: true }).click();
    await page.waitForURL(u => u.hash === '#know-your-agent');
    const section = page.locator('#know-your-agent');
    assert.equal(await section.count(), 1);
    assert.match(await section.innerText(), locale === 'es' ? /En desarrollo/ : /In development/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path: `${out}/${locale}-${width}-section.png` });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${out}/${locale}-${width}-page.png`, fullPage: true });
    const links = await section.locator('a').evaluateAll(a => a.map(x => ({ text: x.textContent, href: x.getAttribute('href') })));
    for (const link of links) {
      await section.getByRole('link', { name: link.text, exact: true }).click();
      await page.waitForURL(u => u.pathname + u.search + u.hash === link.href);
      await page.locator('main h1').first().waitFor();
      if (link.href.includes('#agent-authority')) assert.equal(await page.locator('#agent-authority').count(), 1);
      if (link.href.includes('enterprise-access')) assert.ok(await page.locator('form').count() > 0);
      await page.goto(origin + path + '#know-your-agent', { waitUntil: 'domcontentloaded' });
      await page.locator('#kya-heading').waitFor();
    }
    report.cases.push({ locale, width, status: 'PASS', ctas: links });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
}
