import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { accountLocale, accountHref, accountCopy } from '../lib/i18n/account.ts';
import { harness } from './password-recovery-flow.test.mjs';

test('account language is constrained and preserves existing login query', () => {
  assert.equal(accountLocale('es', 'en'), 'es');
  assert.equal(accountLocale('en', 'es'), 'en');
  assert.equal(accountLocale('invalid', 'es'), 'es');
  assert.equal(accountLocale('invalid', 'invalid'), 'en');
  assert.equal(accountHref('/login?password_updated=1#retained', 'es'), '/login?password_updated=1&lang=es#retained');
  assert.equal(accountCopy.es.newPassword, 'Contraseña nueva');
  assert.deepEqual(Object.keys(accountCopy.en).sort(), Object.keys(accountCopy.es).sort());
});

test('actual recovery page renders Spanish for expired and verified recovery sessions', async () => {
  const h = harness();
  const page = h.load('app/account/reset-password/page.tsx').default;
  const expired = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ lang: 'es' }) }));
  assert.match(expired, /lang="es"/);
  assert.match(expired, /El enlace de restablecimiento/);
  assert.match(expired, /mode=forgot-password&amp;lang=es/);
  await h.begin();
  const active = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ lang: 'es' }) }));
  assert.match(active, /Establecer una contraseña nueva/);
  assert.match(active, /aria-label="Confirmar contraseña nueva"/);
  assert.doesNotMatch(active, /aria-label="New password"/);
});
