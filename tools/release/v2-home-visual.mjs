import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const directory = process.env.V2_EVIDENCE_DIRECTORY ?? 'docs/v2/premerge-20260910';
const target = process.env.V2_VISUAL_TARGET ?? 'https://localhost:3443';
const access = process.env.V2_PREVIEW_ACCESS_FILE;
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' });
const report = { target, consent: 'Browser-only rejected-optional fixture; no server consent claim', writes: 'All non-GET/HEAD requests blocked', widths: [], errors: [] };
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
  await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  await context.addInitScript(() => {
    const id = '10000000-0000-4000-8000-000000000001';
    localStorage.setItem('cs_consent_local_v1', JSON.stringify({ schemaVersion: 'cookie-consent-local-v1', receiptId: id, anonymousId: id, idempotencyKey: id, consentVersion: '2026-07-20.1', action: 'REJECT_OPTIONAL', choices: { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false }, source: 'cookie_banner', status: 'synced', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), retryCount: 0, lastAttemptAt: null, serverReceiptId: id }));
    window.__visualCLS = 0;
    window.__visualLCP = 0;
    window.__visualShifts = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__visualShifts.push({ value: e.value, sources: e.sources.map(s => ({ element: s.node?.tagName, className: s.node?.className, previous: s.previousRect.toJSON(), current: s.currentRect.toJSON() })) }); }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__visualCLS += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__visualLCP = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ path: new URL(page.url()).pathname, message: error.message }));
  if (access) await page.goto(JSON.parse(await readFile(access, 'utf8')).url, { waitUntil: 'load', timeout: 90000 });
  for (const width of [1440, 1280, 1024, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(target, { waitUntil: 'load', timeout: 90000 });
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).origin, new URL(target).origin, 'Preview access must resolve to the application');
    await page.getByRole('heading', { level: 1, name: 'Before an AI agent acts, prove it has the authority to do so.' }).waitFor();
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const result = await page.evaluate(async () => {
      const axe = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { overflow: document.documentElement.scrollWidth > innerWidth, h1: document.querySelectorAll('h1').length, cls: window.__visualCLS, lcpMs: window.__visualLCP, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), resources: performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script').length };
    });
    await page.screenshot({ path: `${directory}/home-${width}.png`, fullPage: true });
    result.shifts = await page.evaluate(() => window.__visualShifts);
    report.widths.push({ width, status: response.status(), ...result });
    assert.equal(result.overflow, false, `Overflow at ${width}`);
    assert.equal(result.h1, 1);
    assert.deepEqual(result.violations, [], `Accessibility at ${width}`);
    if (width < 640) {
      const menu = page.getByRole('button', { name: 'Menu', exact: true });
      await menu.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.getByRole('button', { name: 'Close', exact: true }).getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Platform');
      await page.getByRole('button', { name: 'Close', exact: true }).press('Enter');
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(target, { waitUntil: 'load' });
  await page.getByRole('heading', { level: 1, name: 'Before an AI agent acts, prove it has the authority to do so.' }).waitFor();
  report.keyboard = [];
  for (let index = 0; index < 10; index++) {
    await page.keyboard.press('Tab');
    report.keyboard.push(await page.evaluate(() => ({ text: document.activeElement.textContent.trim().slice(0, 80), outline: getComputedStyle(document.activeElement).outlineStyle, width: getComputedStyle(document.activeElement).outlineWidth })));
  }
  assert.ok(report.keyboard.some(item => item.text === 'Request a demo' && item.outline !== 'none' && item.width !== '0px'));
  assert.ok(report.keyboard.some(item => item.text === 'Explore the API' && item.outline !== 'none' && item.width !== '0px'));
  await page.getByRole('link', { name: 'Explore the API', exact: true }).click();
  await page.waitForURL('**/developers/docs');
  await page.locator('main[aria-busy="true"]').waitFor({ state: 'detached', timeout: 90000 });
  report.apiDocs = { path: new URL(page.url()).pathname, heading: await page.locator('h1').textContent() };
  await page.goto(target, { waitUntil: 'load' });
  await page.getByRole('link', { name: 'Request a demo', exact: true }).click();
  await page.waitForURL('**/enterprise-access?intent=demo');
  await page.locator('form [required]').first().waitFor({ timeout: 90000 });
  report.demo = { path: new URL(page.url()).pathname, heading: await page.locator('h1').textContent(), requiredFields: await page.locator('form [required]').count(), submitted: false };
  assert.ok(report.demo.requiredFields > 0);
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = error.message.replace(/([?&]_vercel_share=)[^\s"&]+/g, '$1REDACTED'); process.exitCode = 1; }
finally { await browser.close(); await writeFile(`${directory}/homepage-visual.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
