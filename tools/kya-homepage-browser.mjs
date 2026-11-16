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
    if (landing) assert.equal(await page.locator('main h1').innerText(), locale === 'es' ? 'Tu agente de IA tiene una identidad. Pero ¿tiene autoridad?' : 'Your AI Agent Has an Identity. But Does It Have Authority?');
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
      const reviewTargets = result.incomplete.flatMap(rule => rule.nodes.map(node => ({ rule: rule.id, target: node.target })));
      result.manualReview = await page.evaluate(targets => {
        const rgb = value => {
          const parts = value.match(/[\d.]+/g)?.map(Number);
          if (!parts || parts.length < 3) throw new Error('Unsupported computed color');
          return { channels: parts.slice(0, 3), alpha: parts[3] ?? 1 };
        };
        const luminance = channels => channels.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        return targets.map(({ rule, target }) => {
          if (rule !== 'color-contrast' || target.length !== 1) throw new Error('Unreviewed accessibility result');
          const element = document.querySelector(target[0]);
          if (!element || element.tagName !== 'SPAN' || element.getAttribute('aria-hidden') !== 'true' || element.textContent !== '↓') throw new Error('Only decorative arrow glyph contrast has a manual profile');
          const foreground = rgb(getComputedStyle(element).color);
          if (foreground.alpha !== 1) throw new Error('Foreground composition needs review');
          let ancestor = element;
          let background;
          while (ancestor) {
            const color = rgb(getComputedStyle(ancestor).backgroundColor);
            if (color.alpha === 1) { background = color; break; }
            if (color.alpha !== 0) throw new Error('Background composition needs review');
            ancestor = ancestor.parentElement;
          }
          if (!background) throw new Error('No opaque background established');
          const a = luminance(foreground.channels), b = luminance(background.channels);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (ratio < 4.5) throw new Error('Arrow contrast below review threshold');
          return { rule, target, foreground: foreground.channels, background: background.channels, contrastRatio: ratio, threshold: 4.5, result: 'PASS', method: 'Rendered computed colors; raw axe glyph finding retained' };
        });
      }, reviewTargets);
      assert.equal(result.manualReview.length, reviewTargets.length);
      await writeFile(`${out}/${name}-accessibility.json`, JSON.stringify(accessibility, null, 2) + '\n');
      assert.deepEqual(result.violations, [], `${name} accessibility ${selector}`);
      if (selector === 'header' && width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Cerrar menú' : 'Close', exact: true }).click();
    }
    const diagram = section.locator('img[src*="kya-ai-agent-trust-flow"]');
    await diagram.scrollIntoViewIfNeeded();
    await diagram.evaluate(async image => { await image.decode(); });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const sectionClip = await section.boundingBox();
    assert.ok(sectionClip);
    await page.screenshot({ path: `${out}/${name}-section.png`, fullPage: true, clip: sectionClip });
    await page.screenshot({ path: `${out}/${name}-page.png`, fullPage: true });
    const imageGeometry = await diagram.evaluate(image => ({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: image.width, height: image.height, fit: getComputedStyle(image).objectFit, alt: image.alt }));
    assert.ok(imageGeometry.naturalWidth > 0 && imageGeometry.naturalHeight > 0);
    assert.ok(Math.abs(imageGeometry.width / imageGeometry.height - 1) < 0.01);
    assert.equal(imageGeometry.fit, 'contain');
    assert.ok(imageGeometry.alt.length > 60);
    const original = await page.request.get(origin + '/kya-ai-agent-trust-flow.png');
    assert.equal(original.status(), 200);
    const { createHash } = await import('node:crypto');
    assert.equal(createHash('sha256').update(await original.body()).digest('hex'), 'abdace2668833639f32dbf4331928a737ff93c655172280b9a5ba0826b2fe7e8');
    assert.equal(await section.locator('a[href="/kya-ai-agent-trust-flow.png"]').count(), 1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const diagramClip = await diagram.boundingBox();
    await page.screenshot({ path: `${out}/${name}-diagram.png`, fullPage: true, clip: diagramClip });
    const links = await section.locator('a:not([href="/kya-ai-agent-trust-flow.png"])').evaluateAll(a => a.map(x => ({ text: x.textContent, href: x.getAttribute('href') })));
    for (const link of links) {
      const control = section.getByRole('link', { name: link.text, exact: true });
      await control.focus();
      assert.equal(await control.evaluate(e => document.activeElement === e), true);
      await page.keyboard.press('Enter');
      try {
        await page.waitForURL(u => u.pathname + u.search + u.hash === link.href, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        report.errors.push({ path, width, expected: link.href, actual: page.url(), message: error.message });
        await page.screenshot({ path: `${out}/${name}-navigation-failure.png`, fullPage: true });
        throw error;
      }
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
    let fragmentRepeatChecks = 0;
    if (landing && locale === 'es' && width === 390) {
      for (let repeat = 0; repeat < 5; repeat++) {
        const authority = section.getByRole('link', { name: 'Explorar la autoridad de los agentes', exact: true });
        await authority.focus();
        await page.keyboard.press('Enter');
        await page.waitForURL(u => u.pathname === '/es/platform' && u.hash === '#agent-authority', { waitUntil: 'domcontentloaded' });
        await page.locator('#agent-authority').waitFor();
        fragmentRepeatChecks++;
        await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
        await page.locator('#kya-heading').waitFor();
      }
    }
    if (landing) {
      if (width === 390) await page.getByRole('button', { name: locale === 'es' ? 'Abrir menú' : 'Open menu', exact: true }).click();
      await page.getByRole('button', { name: locale === 'es' ? /Cambiar idioma/ : /Change language/ }).click();
      await page.getByRole('button', { name: locale === 'es' ? 'English' : 'Español · sitio público', exact: true }).click();
      await page.waitForURL(u => u.pathname === (locale === 'es' ? '/platform/kya' : '/es/platform/kya'));
      assert.equal(await page.locator('html').getAttribute('lang'), locale === 'es' ? 'en' : 'es');
    }
    report.cases.push({ path, locale, width, landing, status: 'PASS', image: imageGeometry, originalPngSha256: 'abdace2668833639f32dbf4331928a737ff93c655172280b9a5ba0826b2fe7e8', ctas: links, fragmentRepeatChecks, accessibility });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
}
