# Sprint 9.4 Acceptance Criteria

Release: 0.9.4 Focused Enterprise Experience
Status: complete with one documented visual-browser limitation

## Working software

- [x] Homepage implements the approved nine-section content model plus footer.
- [x] Public navigation is Platform, Solutions, Trust, Enterprise, Developers, Pricing, Resources and Login.
- [x] Desktop and mobile dropdowns are bounded, grouped and keyboard dismissible.
- [x] Footer uses six readable groups; About and Help are footer-only.
- [x] True duplicate public routes have permanent redirects.
- [x] Protected/admin/data-backed routes retain middleware and noindex behavior.
- [x] Archived/internal routes are absent from public navigation and sitemap.

## Green build

- [x] `npm run lint` (repository script runs a full Next production build).
- [x] `npm run typecheck`.
- [x] `npm run test:public-surface` (5 checks).
- [x] All eight existing named test suites (42 checks). `npm test` is not defined; no empty command was added.
- [x] `npm run build`.

Executed route smoke checks returned 200 for `/`, `/platform`, `/trust`, `/enterprise`, `/developers`, `/pricing` and `/sitemap.xml`; duplicate routes returned 308; protected `/trust-center` returned a private, noindex 503 when local Supabase configuration was intentionally absent.

The in-app visual browser controller was unavailable in this session. Responsive behavior was validated through component contracts, Tailwind breakpoints, bounded menu CSS, build rendering and static navigation tests, but desktop/tablet/mobile screenshot inspection remains a manual release check.

## Documentation and demo

- [x] Complete page-route inventory.
- [x] Canonical content ownership map.
- [x] Reversible archived-route register.
- [x] Homepage content model.
- [x] Under-five-minute buyer walkthrough.
- [x] Release notes.

## Product acceptance

- [x] About and Help are not in primary navigation.
- [x] AI sovereignty has one detailed home under Trust.
- [x] Replay has one public assurance model and separate protected operational records.
- [x] Trust Memory has one detailed public explanation.
- [x] Governance ownership is split explicitly between platform control, trust transparency and protected operations.
- [x] Platform contains architecture, not industry positioning.
- [x] Solutions contains buyer problems, not duplicated architecture.
- [x] Hiring is one solution only.
- [x] No working API or dynamic/data-backed capability was deleted.
- [x] No new marketing route was introduced; sitemap is SEO infrastructure.
- [x] Homepage has one primary CTA and each major page retains one primary purpose.
