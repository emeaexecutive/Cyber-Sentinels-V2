# Enterprise performance

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Performance objective

Enterprise performance must support fast public evaluation, predictable authenticated navigation, bounded operational queries and usable evidence exports. Performance states must remain observable without exposing customer data.

## Current architecture profile

| Characteristic | Current source inventory | Interpretation |
| --- | --- | --- |
| Bundle size | Current production build: 102 kB shared first-load JavaScript; 90.6 kB middleware | No enforced size budget or analyzer; build output is evidence for the audited commit, not a runtime-user distribution |
| Page routes | 224 `page.tsx` files | Large route surface increases governance and regression cost |
| Client page modules | 5 pages declare `use client` | Most page rendering remains server-first |
| Dynamic pages | 129 pages declare `force-dynamic` | Appropriate for protected/current state in many cases, but requires route-by-route justification |
| Streaming | 5 `loading.tsx` boundaries | Root, dashboard, workspace, Trust Center and notifications can present route-level fallback UI; this does not prove granular data streaming |
| Lazy loading | 1 inspected dynamic import | Enterprise shell defers the command palette |
| Server Components | All but 5 inspected page modules remain server components | Reduces public client JavaScript, while dynamic server work still needs latency control |
| Caching | Protected/current routes commonly opt into dynamic rendering; audit exports are private/no-store | Correctness is prioritized; public cache/revalidation ownership is not uniformly documented |
| Image optimisation | 0 `next/image` imports; 1 raw protected support screenshot | Public pages are not image-heavy; the support image needs explicit dimension/size controls |
| Font optimisation | System font stack; no remote font loader identified | Avoids external font blocking and layout shifts |
| Dashboard reads | 8 bounded count queries dispatched in parallel | Reasonable summary pattern, subject to real tenant latency testing |
| Back Office reads | Roughly 30 table reads plus readiness/health/graph calculations | Largest identified server-render fan-out and principal authenticated latency risk |

## Existing measured evidence

The last recorded Sprint 16 Lighthouse run, not rerun in this audit, reported:

| Route | Profile | Performance | FCP | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Buyer Documentation | Mobile | 79 | 0.9 s | 2.4 s | 0.007 | 770 ms |
| Buyer Documentation | Desktop | 100 | 0.3 s | 0.6 s | 0 | 60 ms |
| Pilot Checklist | Mobile | 83 | 1.0 s | 2.5 s | 0 | 590 ms |
| Pilot Checklist | Desktop | 99 | 0.3 s | 0.7 s | 0 | 80 ms |

These measurements show strong desktop delivery but material mobile main-thread work. They cover two public routes only. They are historical evidence, not a current production service-level claim.

The Part 4 production build completed on 2026-07-18 with 102 kB shared first-load JavaScript. Representative route totals ranged from 103 kB for small API/utility entries to 177 kB for `/login`; `/enterprise` and the dashboard family reported 106 kB, `/enterprise-access` 108 kB, and `/enterprise/control-plane` 111 kB. These are build-time transfer groupings, not Core Web Vitals measurements.

## Budgets and release thresholds

The following are target budgets for representative production-like tests, not current measured guarantees:

| Metric | Public evaluation | Authenticated operations |
| --- | --- | --- |
| LCP p75 | <= 2.5 s | <= 2.5 s for primary content |
| INP p75 | <= 200 ms | <= 200 ms for routine actions |
| CLS p75 | <= 0.1 | <= 0.1 |
| Initial server response | <= 800 ms | <= 1.2 s with representative tenant data |
| Route transition feedback | <= 300 ms before visible progress | <= 300 ms before visible progress |
| Trust Report export | Visible acknowledgement <= 300 ms; bounded completion telemetry | Same, with timeout and retry-safe behaviour |

Budgets must be measured by route, device class, region and role. An average must not hide a slow protected workflow.

## Caching and data-loading policy

- Public static explanations should use static generation or explicit revalidation when their dependencies permit it.
- Authentication, authorization, readiness, provider health and current trust state must not be cached across users or tenants.
- Parallel reads should remain bounded and project only required fields or counts.
- Large evidence histories should paginate or stream rather than block the first useful view.
- Export caching must remain private and no-store unless a threat review establishes a scoped encrypted cache.
- Process-local caches and profilers are diagnostics, not distributed production observability or durable truth.
- Signed support images must have bounded dimensions and byte size; the protected raw image path needs explicit review before broader use.

## Current risks and gaps

1. There is no enforced bundle-size, route-timing or Core Web Vitals budget in the validation pipeline.
2. Mobile TBT in the recorded public Lighthouse runs is the clearest measured risk.
3. Back Office combines a large page module with broad read fan-out; it needs representative latency, failure and partial-data tests.
4. The root layout resolves session/platform context for the shared application shell; public-route cost should be measured explicitly.
5. Only five route families have loading boundaries despite a large dynamic route set.
6. No bundle analyzer is configured.
7. Protected dashboard, governance, Replay, reports and administration lack recorded representative-data performance baselines.
8. Runtime profiler state is process-local and cannot establish fleet-level latency or availability.
9. The raw protected support screenshot bypasses framework image sizing/optimization.

## Test plan

Measure cold and warm navigation for public Enterprise, Buyer Documentation, Pilot, login, dashboard, governance, Replay, report export and Back Office. Use small and representative tenant datasets, induced provider latency, missing optional tables and denied authorization. Record server time, query count, response size, LCP, INP, CLS, long tasks, memory and export completion. Treat a blocked dependency as a visible state, not an excuse for an indefinitely pending page.
