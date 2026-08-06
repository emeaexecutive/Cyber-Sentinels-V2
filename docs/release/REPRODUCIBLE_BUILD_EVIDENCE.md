# Reproducible build evidence

## Environment and method

- Final source: Epic 35 working tree after the browser-discovered Enterprise Access mobile min-width correction.
- Node: 22.23.1; npm: 10.9.8; lockfile version: 3.
- Lock SHA-256: `0b02081a19a5bccc44da87b0ca3d3abc97f866fa1de280712a93a4db372fa109`.
- Generated `node_modules` and `.next` directories were removed from the active worktree through verified, recoverable moves before each clean install/build boundary.
- Cycle A used a clean `npm ci` completed immediately before the source-only responsive correction; because neither manifest nor lockfile changed, that install is the same final dependency graph. All validation and its build ran after the correction.
- Cycle B removed Cycle A's install/build state, ran a fresh `npm ci`, and repeated every gate.

One earlier Cycle 2 install attempt was discarded after a stale task-owned local server left an npm child process orphaned until the command timeout. The exact processes were stopped, the partial install was preserved outside the repository, and the counted cycle restarted from no `node_modules`. The unrelated port-3100 process was never touched.

## Cycle results

| Gate | Final Cycle A | Final Cycle B |
| --- | ---: | ---: |
| Clean `npm ci` | Pass, 103.97 s | Pass, 77.44 s |
| Lock unchanged after install | Pass | Pass |
| `npm ls --all` | Exit 0 | Exit 0 |
| Graph SHA-256 | `b17a50a1dc4342284ccd09d7d45c3f6ddd1efb0851965b7c0579ff7fa19f7e8c` | Same |
| `npm audit --json` | 0 findings | 0 findings |
| Lint | Pass, 48.08 s | Pass, 138.70 s |
| Typecheck | Pass, 14.84 s | Pass, 36.82 s |
| Full tests | Pass, 124.80 s | Pass, 88.46 s |
| Optimized build | Pass, 342.96 s | Pass, 244.73 s |
| Static pages generated | 191 | 191 |

The only npm graph annotations are the known Windows optional-platform Sharp fallback entries `@img/sharp-wasm32` and `@emnapi/runtime`; `npm ls --omit=optional` is clean and the dependency gate rejects any other problem.

## Build-output comparison

| Signal | Cycle A | Cycle B | Result |
| --- | --- | --- | --- |
| Build ID | `l0YLz3BK0BeJCdokpv71b` | `HXdMszNtp27k3404wssCR` | Expected nondeterminism |
| App paths | 501 | 501 | Match |
| Static routes | 230 | 230 | Match |
| Dynamic routes | 124 | 124 | Match |
| Static files | 534 | 534 | Match |
| CSS | 1 file / 64,254 bytes | 1 file / 64,254 bytes | Match |
| CSS aggregate SHA-256 | `72b26abf9b9f70e20236c33e7843e7cbe99e8c19ba7930ea1e4a604a25ac196d` | Same | Byte-identical |
| JavaScript | 533 files / 2,039,253 bytes | 533 files / 2,039,253 bytes | Match |
| Common static files | 532 | 532 | All byte-identical |

Only four structure-diff rows exist: each build has its own `_buildManifest.js` and `_ssgManifest.js` path under the generated build-ID directory. No common static file differs. This is expected Next.js build-ID variance, not dependency or application drift.

## Warnings and browser evidence

- Lint consistently reports two pre-existing unused-import warnings and zero errors.
- Builds consistently report Webpack large-string cache performance warnings; compilation, page generation and traces complete.
- Node tests retain existing typeless-package reparsing warnings; tests pass.
- Local Chrome rendered public, auth, reset-password, pricing, Enterprise Access, design-partner, waitlist and demo routes with their stylesheet loaded and no React/hydration error.
- Account-creation and forgot-password mode changes passed; browser history returned login → pricing correctly; mobile homepage and Enterprise Access had no horizontal overflow after the responsive correction.
- Login logs the expected missing local Supabase configuration; protected routes return `Protected surface unavailable.` No live authentication or payment success is claimed.

Production and staging were not accessed or mutated.
