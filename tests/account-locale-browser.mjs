import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

test('EN/ES recovery form preserves locale, validates and handles security-code errors', async () => {
  const bundle = await build({
    stdin: { contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import {ResetPasswordForm} from "./app/account/reset-password/reset-password-form"; import {AccountLanguageControl} from "./components/account-language-control"; const locale=new URL(location.href).searchParams.get("lang")==="es"?"es":"en"; createRoot(document.getElementById("root")).render(<><ResetPasswordForm locale={locale}/><AccountLanguageControl locale={locale}/></>);', resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    plugins: [{ name: 'framework-link', setup(b) {
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'import React from "react"; export default function Link(p){return React.createElement("a",p);}', resolveDir: process.cwd() }));
    } }],
  });
  const browser = await chromium.launch({ headless: true });
  await mkdir('artifacts/execution06-account', { recursive: true });
  try {
    for (const locale of ['en', 'es']) for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      let calls = 0;
      await page.route('**/*', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/form.js') return route.fulfill({ contentType: 'application/javascript', body: bundle.outputFiles[0].text });
        if (u.pathname === '/api/auth/password-reset/complete') {
          calls++;
          return route.fulfill({ status: calls === 1 ? 409 : 503, contentType: 'application/json', body: JSON.stringify(calls === 1 ? { ok: false, code: 'REAUTHENTICATION_REQUIRED', error: 'Enter the security code we sent to your email.' } : { ok: false, code: 'RECOVERY_SIGN_OUT_FAILED', error: 'Password updated, but sign out could not complete. Please try signing out again.' }) });
        }
        return route.fulfill({ contentType: 'text/html', body: '<html><body style="background:#04070c;color:white"><main style="max-width:450px;margin:auto;padding:16px"><div id="root"></div></main><script src="/form.js"></script></body></html>' });
      });
      await page.goto(`http://localhost:3000/account/reset-password?lang=${locale}&next=%2Fretained#form`);
      const es = locale === 'es';
      await page.getByRole('heading', { name: es ? 'Establecer una contraseña nueva' : 'Set a new password' }).waitFor();
      await page.getByLabel(es ? 'Contraseña nueva' : 'New password', { exact: true }).fill('fixture-new-password');
      await page.getByLabel(es ? 'Confirmar contraseña nueva' : 'Confirm new password', { exact: true }).fill('fixture-mismatch');
      await page.getByRole('button', { name: es ? 'Actualizar contraseña' : 'Update password', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.' }).waitFor();
      assert.equal(calls, 0);
      await page.getByLabel(es ? 'Confirmar contraseña nueva' : 'Confirm new password', { exact: true }).fill('fixture-new-password');
      await page.getByRole('button', { name: es ? 'Actualizar contraseña' : 'Update password', exact: true }).click();
      await page.getByLabel(es ? 'Código de seguridad' : 'Security code').waitFor();
      assert.equal(calls, 1);
      await page.getByLabel(es ? 'Código de seguridad' : 'Security code').fill('123456');
      await page.getByRole('button', { name: es ? 'Actualizar contraseña' : 'Update password', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: es ? 'La contraseña se ha actualizado, pero no se pudo cerrar la sesión.' : 'Password updated, but sign out could not complete.' }).waitFor();
      assert.equal(calls, 2);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `artifacts/execution06-account/${locale}-${width}.png`, fullPage: true });
      await page.getByRole('combobox').selectOption(es ? 'en' : 'es');
      await page.waitForURL(u => u.searchParams.get('lang') === (es ? 'en' : 'es'));
      const next = new URL(page.url()); assert.equal(next.searchParams.get('next'), '/retained'); assert.equal(next.hash, '#form');
      assert.ok((await page.context().cookies()).some(c => c.name === 'cyber_sentinels_locale' && c.value === (es ? 'en' : 'es')));
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
