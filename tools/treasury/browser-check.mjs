import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { startTreasurySandbox } from './sandbox-server.mjs';
const s = await startTreasurySandbox(); let browser;
const output = 'artifacts/execution06-treasury/browser'; await mkdir(output, { recursive: true });
try {
  const signed = s.h.signed(), a = await s.h.treasury.authorize(s.h.tenant, signed);
  await s.h.treasury.commit(s.h.tenant, a.mandateId, signed);
  browser = await chromium.launch({ headless: true }); const errors = [], checks = [];
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } }); page.on('pageerror', e => errors.push(e.message));
    await page.goto(s.url); await page.locator('#summary').filter({ hasText: '1' }).waitFor();
    for (const locale of ['en', 'es']) {
      await page.locator('#locale').selectOption(locale); await page.reload();
      await page.locator('#summary').filter({ hasText: '1' }).waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.locator('#locale').inputValue(), locale);
      assert.ok((await page.locator('#events').textContent()).includes('ALLOW'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `${output}/${locale}-${width}.png`, fullPage: true }); checks.push({ locale, width, status: 'PASS' });
    }
    await page.close();
  }
  assert.deepEqual(errors, []); await writeFile(output + '/result.json', JSON.stringify({ checks, errors, synthetic: true }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', checks, errors, output }));
} finally { await browser?.close(); await s.close(); }
