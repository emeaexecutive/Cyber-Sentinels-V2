# Component library

## Scope and interpretation

`components/` contains 46 TSX modules. This inventory treats each module as the reusable unit and lists all exported components or data. Every component outputs React JSX unless noted. “Server” means no `use client` directive was observed; it may be composed by a Server Component but is not proof that every dependency is server-only.

Accessibility evidence is source-level only: **ARIA**, **Label**, **Semantic**, and **Button** mean those constructs were observed. **None explicit** means no such marker was found, not that the component is inaccessible. Manual keyboard, screen-reader, focus, contrast and zoom testing remains required.

## Inventory

| Module / exports | Purpose | Inputs | Outputs | Main dependencies | Runtime | Accessibility evidence | Reuse | Deprecation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `access-governance-center` / `AccessGovernanceCenter` | Governance summary and decisions | Inline typed governance data | Governance UI | access-governance, ExecutiveSummary, Link | Server | Semantic | 2 consumers | Active |
| `admin-verification-actions` / `AdminVerificationActions` | Admin case actions | `AdminVerificationActionsProps` | Action controls | back-office | Server | Button | 1 | Active |
| `continuous-trust-lifecycle-dashboard` / `ContinuousTrustLifecycleDashboard` | Lifecycle state display | Typed lifecycle snapshot | Dashboard UI | core/trust-lifecycle | Server | Semantic | 1 | Active |
| `decision-intelligence-timeline` / `DecisionIntelligenceTimeline` | Decision chronology | `DecisionIntelligence` | Timeline UI | core/decision-intelligence | Server | Semantic | 1 | Active |
| `enterprise-breadcrumbs` / `EnterpriseBreadcrumbs` | Enterprise page context | current label, optional parent action | Breadcrumb nav | enterprise-experience, Link | Server | ARIA, Semantic | 2 | Active |
| `enterprise-cta-group` / `EnterpriseCTAGroup` | Shared enterprise next steps | optional label | CTA navigation | enterprise-experience, Link | Server | ARIA, Semantic | 2 | Active |
| `enterprise-decision-card` / `EnterpriseDecisionCard` | Executive decision summary | `DecisionIntelligence` | Decision card | core/decision-intelligence | Server | Semantic | 1 | Active |
| `enterprise-navigation` / `EnterpriseNavigation` | Enterprise local navigation | none | Responsive navigation | enterprise-experience, Next navigation | Client | ARIA, Semantic | 1 | Active |
| `enterprise-trust-control-plane` / `EnterpriseTrustControlPlane` | Interactive policy/control-plane demonstration | Inline typed control values | Interactive controls and state | policy-engine, React | Client | Label, Semantic, Button | 1 | Active |
| `enterprise-visuals` / 10 visual components | Shared flows, timelines, evidence/provider cards and buyer grids | Typed steps, cards, journeys and labels | Visual/semantic compositions | enterprise-experience, Link, React | Server | ARIA, Semantic | 5 modules | Active |
| `evidence-disclaimer` / `EvidenceDisclaimer` | Reusable evidence boundary copy | optional className | Disclaimer text | none | Server | None explicit | 3 | Active |
| `executive-summary` / `ExecutiveSummary`, `DecisionSummary` | Shared executive summaries and decision lists | Inline summary props / decision items | Summary sections | Link | Server | ARIA, Semantic | 27 | Active |
| `global-navigation` / `GlobalNavigation`, `publicHeaderLinks` | Global access-aware navigation | navigation access level | Header/nav plus exported link data | Next navigation, React | Client | ARIA, Semantic, Button | 1 root consumer | Active |
| `governance-overview` / `GovernanceOverview` | Governance metrics and records | `GovernanceOverviewProps` | Governance overview | enterprise-governance mock data | Server | Semantic | 1 | Active; mock fallback is environment-bound |
| `interactive-demo-scenario` / `InteractiveDemoScenario` | Interactive demo state | Inline typed scenario content | Demo controls and outcome | Link, React | Client | Semantic, Button | 2 | Active |
| `interactive-trust-walkthrough` / `InteractiveTrustWalkthrough` | Guided trust walkthrough | none | Interactive walkthrough | React | Client | ARIA, Semantic, Button | 0 imports found | Unreferenced; review before deprecation |
| `legal-draft-page` / `LegalDraftPage` | Shared legal-document shell | `LegalDraftPageProps` | Legal article and notices | Link | Server | Semantic | 14 | Active |
| `living-trust-profile` / `LivingTrustProfileView` | Living profile presentation | profile or null | Profile/empty state | trust/living-trust-profile | Server | ARIA, Semantic | 1 | Active |
| `network-intelligence-dashboard` / `NetworkIntelligenceDashboard` | Network intelligence dashboard | Inline typed network data | Dashboard UI | network-intelligence, ExecutiveSummary, Link | Server | Semantic | 2 | Active |
| `onboarding-walkthrough` / `OnboardingHint` | Contextual onboarding hint | walkthrough area | Hint copy | none | Server | None explicit | 6 | Active |
| `phase-one-trust` / 8 trust components | Phase-one badges, timeline, factors, passport and placeholders | scores, status, events, factors and typed passport data | Cards, badges and lists | trusted-layer/phase1, Link | Server | None explicit markers | 13 module consumers | Active; placeholder export is explicitly named |
| `print-receipt-button` / `PrintReceiptButton` | Browser print action | none | Print button | browser print API | Client | Button | 2 | Active |
| `private-beta` / 3 beta components | Beta badge, notice and feedback prompt | optional className | Status/notice UI | beta-mode | Server | None explicit | 7 | Active |
| `provider-evidence-panel` / `ProviderEvidencePanel` | Provider evidence and status display | typed provider signals | Evidence panel | provider types | Server | Semantic | 5 | Active |
| `public-page-adoption-rail` / `PublicPageAdoptionRail` | Public-page next-step rail | none | Route-aware adoption CTA | public navigation config, Next navigation | Client | ARIA | 1 root consumer | Active |
| `receipt-verification-form` / `ReceiptVerificationForm` | Receipt lookup form | none; user entry | Form and navigation | Next router, React | Client | Label, Button | 1 | Active |
| `report-issue` / `ReportIssue` | Authenticated issue reporter | auth-state string | Issue form/dialog | Next router, React | Client | Label, Button | 1 root consumer | Active |
| `session-integrity` / 3 integrity components | Integrity badge, evidence note and signal cards | label and typed integrity data | Badge/notes/cards | session-integrity model | Server | Semantic | 7 module consumers | Active |
| `trust-card` / `TrustCard` | Minimal trust metric card | label, value, optional highlight | Metric card | none | Server | None explicit | 0 imports found | Unreferenced; review before deprecation |
| `trust-evaluation/BenchmarkCard` / `BenchmarkCard` | Benchmark result card | Inline typed benchmark values | Benchmark card | trustEvaluationBenchmarks | Server | ARIA, Semantic | 1 | Active |
| `trust-explanation-card` / `TrustExplanationCard` | Explainable decision card | `TrustExplanation` | Explanation card | trust-explanation | Server | Semantic | 1 | Active |
| `trust-explanation-timeline` / `TrustExplanationTimeline` | Explainable decision chronology | `TrustExplanation` | Timeline | trust-explanation | Server | Semantic | 1 | Active |
| `trust-journey-visualization` / `TrustStateBadge`, `TrustJourneyVisualization` | Trust-state and journey visualization | journey state and typed journey content | Badge and journey | local types | Server | ARIA, Semantic | 4 module consumers | Active |
| `trustops-operating-stack` / `TrustOpsOperatingStack`, data | TrustOps layer stack | Inline optional presentation props | Stack plus exported layer data | none | Server | None explicit | 2 | Active |
| `trust-os/command-palette` / default `CommandPalette` | Keyboard command navigation | typed open/actions callbacks | Dialog/search controls | trust-os context, Next router, React | Client | ARIA, Label, Semantic, Button | 1 | Active |
| `trust-os/degraded-mode-guidance` / `DegradedModeGuidance` | Degraded-state guidance | none | Guidance region | trust-os/degraded-states | Server | ARIA, Semantic | 1 | Active |
| `trust-os/enterprise-shell` / `EnterpriseTrustOSShell` | Authenticated application shell | access level, status, children | Shell/navigation/status UI | trust-os context, Next dynamic/link/navigation, React | Client | ARIA, Semantic, Button | 1 root consumer | Active |
| `trust-os/loading` / `TrustOSLoading` | Shared loading state | optional label | Loading status | none | Server | ARIA, Semantic | 4 | Active |
| `trust-posture-dashboard` / badge and dashboard | Trust posture and lifecycle dashboard | posture/lifecycle typed data | Badge and dashboard | lifecycle, posture, executive/visual components, Lucide, Link | Server | Semantic | 2 | Active |
| `trust-radar-refresh` / `TrustRadarRefresh` | Router refresh action | none | Refresh control | Next router, React | Client | None explicit | 1 | Active; manual accessible-name check required |
| `trust-report-boundary` / copy and `TrustReportBoundary` | Standard report limitation | none | Boundary copy/notice | none | Server | None explicit | 4 | Active |
| `trust-transparency-report` / `TrustTransparencyReportView` | Transparency report presentation | typed trust report | Report plus print action | trust-transparency, PrintReceiptButton, Link | Server | Semantic | 2 | Active |
| `turnstile-field` / `TurnstileField` | Cloudflare Turnstile field | site key | Script/widget container | Next Script | Server | None explicit in wrapper | 2 | Active when configured |
| `validation-benchmark-dashboard` / `ValidationBenchmarkDashboard` | Validation metrics dashboard | typed benchmark dataset | Dashboard UI | benchmarking | Server | Semantic | 2 | Active |
| `verification-queue-actions` / `VerificationQueueActions` | Back-office queue actions | case ID | Action controls | back-office | Server | Button | 1 | Active |
| `waitlist-form` / `WaitlistForm` | Public waitlist submission | user entry; Turnstile token when configured | Form/status UI | Next Script, React | Client | Button; no source label marker | 0 imports found | Unreferenced; review before deprecation |

## Library observations

- The library has no barrel file, Storybook, visual test harness or explicit component versioning.
- Most props are inline or module-local rather than exported reusable contracts.
- Three modules have no static import consumer: the interactive walkthrough, TrustCard and waitlist form. Dynamic use was not found, but removal requires route/runtime verification.
- Accessibility markers are inconsistent and are not a substitute for manual validation.
- No component is formally marked deprecated. Future deprecation should record replacement, consumer migration and removal milestone.
