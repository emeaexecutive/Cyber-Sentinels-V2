# Final bounded verification ? 3 November 2026

Executed in the independent website candidate directory, based on 63a0e0f550f65b4beb3c52afabdba0481b510e69. No secret files were copied. Installed workspace dependencies resolve through the parent workspace; pinned Next 15.5.28 and React 19.2.8 match the candidate. No npm install, hosted migration or live provider call.

- `npm.cmd run typecheck --prefix tmp/website-only-20261103` from founder workspace: exit 0.
- `node ../../node_modules/eslint/bin/eslint.js app/demo/trust-runtime/page.tsx app/world-id-preview/page.tsx app/enterprise-access/page.tsx components/auth-unavailable.tsx components/public-language-selector.tsx components/global-navigation.tsx app/pricing/page.tsx app/help/page.tsx`: exit 0, empty changed-lint.log.
- Initial focused set: `node --import tsx --test tests/pricing-surface.test.mjs tests/public-surface-navigation.test.mjs tests/public-help-preview.test.mjs tests/auth-callback-redirect-security.test.mjs tests/supabase-ssr-auth-regression.test.mjs`: 33 pass, 0 fail. Superseded by final targeted set after adding entry guards.
- Final targeted command: `node --import tsx --test tests/website-auth-entry.test.mjs tests/pricing-surface.test.mjs tests/public-surface-navigation.test.mjs tests/public-help-preview.test.mjs tests/auth-callback-redirect-security.test.mjs tests/supabase-ssr-auth-regression.test.mjs tests/request-demo.test.mjs`: 37 pass, 0 fail. The last supplied filename does not exist on this baseline and did not contribute tests; actual enquiry tests were then explicitly run in the next command.
- `node --import tsx --test tests/request-demo-api.test.mjs tests/public-i18n.test.mjs`: 48 pass, 0 fail. Mocked enquiry handler behavior, no real submission or delivery. Combined final focused count: 85 passed, zero failures/skips. The initial 33 are not counted twice.
- `git diff --check`: exit 0; Git emits existing LF/CRLF conversion notices.
- `git diff --quiet -- app/api lib supabase middleware.ts package.json package-lock.json`: exit 0; no operational/dependency source diff against main.
- `npm.cmd run build > build.log 2>&1`: production build, result recorded in final verification-summary.json. Local workspace-root inference warning is caused by the nested isolated clone; no build configuration was changed to suppress it. Compiled bundle was checked to include the new email link.
- `node ../../node_modules/next/dist/bin/next start -H 127.0.0.1 -p 4333`: production-mode local server for browser checks. No founder service port changed.
- `node tools/release/website-recovery-interactions.mjs`: candidate-specific pricing geometry, four widths, language selection/persistence/keyboard/RTL/mobile navigation, form validation and disclosure; output interactions.json and proof/.
- `node tools/release/website-recovery-smoke.mjs`: candidate-specific Help, both Auth-unavailable routes, demo/pilot headings and mailto destination. No form submission.

Prior accessibility/150-URL crawl evidence is preserved under prior-proof, explicitly not recounted as a new candidate-wide run. Platform API inventory and integration evidence were reused; no unchanged full platform suite or all-handler retest was performed. Hosted valid-key success, provider delivery, tenant isolation, production source equivalence and historical 500 diagnosis remain unverified.

PowerShell wrapper diagnostic: a standalone `node -e "console.error('wrapper-stderr-check')" > wrapper-check.log 2>&1` also returns tool exit 1 despite native exit 0, reproducing the build-wrapper false failure. The original build completed all 208 pages and production-mode browser checks passed. One necessary cached final confirmation is run through `node tools/release/website-recovery-build.mjs`, which records native status directly in native-build-result.json and streams both outputs to native-build.log. No source code changed between browser verification and this confirmation.

Final native build confirmation: **exit 0**, 208 static pages generated. Browser interactions: **16/16 PASS**. Production-mode route smoke: **5/5 PASS**, plus mailto inspection. Build, lint and type checks did not require secret configuration.
