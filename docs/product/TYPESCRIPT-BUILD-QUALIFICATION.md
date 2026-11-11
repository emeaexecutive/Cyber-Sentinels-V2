# TypeScript and production-build qualification

**Baseline:** `main` at `63a0e0f550f65b4beb3c52afabdba0481b510e69`  
**Qualification date:** 11 November 2026

## Root cause and correction

The project TypeScript configuration included `**/*.ts` and `**/*.tsx`, but excluded only the root `node_modules` directory. The original, dirty checkout contained 20,200 additional TypeScript files (131,432,670 bytes) under ignored `tmp/` nested worktrees. Those scratch files are not part of the application or release source, but the recursive include could bring them into a root-level typecheck and exhaust Node's default heap.

The configuration now excludes only the ignored `tmp/` and `temp/` scratch trees in addition to `node_modules`. Application, library, component, script, and test sources remain in scope. Generated `.next` types remain included for Next.js route validation.

## Validation evidence

Environment: Node `v22.23.1`, npm `10.9.8`, TypeScript `5.9.3`, Next.js `15.5.28`. The clean worktree at the baseline had 1,228 project TypeScript files. After the production build generated Next.js types, the typecheck program contained 2,623 files.

An ignored nested `tmp/typescript-include-probe/nested/ignored.ts` fixture was absent from both `tsc --showConfig` and `tsc --listFilesOnly` after the exclusion was added. The probe was removed after the check.

With the generated Next.js route types present and `tsconfig.tsbuildinfo` removed to force a fresh full check, `npm run typecheck -- --extendedDiagnostics` passed:

- Across fresh runs, TypeScript-reported memory was approximately `1.6–2.2 GiB`, and total time was `60–100s`.
- Sampled aggregate Node working set peaked at approximately `2.3 GiB`.
- No heap-size override or suppressed diagnostics

`npm run build` passed, compiled successfully, and generated all `208/208` static pages. Across clean builds, sampled aggregate Node working set peaked at approximately `2.4–3.0 GiB`. These measurements are local, not hosted or Production qualification.

The full `npm audit` reported six moderate issues in development dependencies; `npm audit --omit=dev` reported zero production dependency issues. No dependency updates were applied.
