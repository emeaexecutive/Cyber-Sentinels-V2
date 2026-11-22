# Language and route qualification — 12 November 2026

Status: **NO-GO for full English/Spanish product localization**. This report measures source publication ownership separately from content approval and runtime qualification. No hosted request or browser accessibility test was performed in this audit. Existing logs are historical evidence, not fresh verification.

Fresh local check on the preserved dirty worktree at HEAD b789166: node --test tests/public-i18n.test.mjs passed 4/4 tests with zero failures, skips or cancellations on 12 November 2026. These verify the English-only registry boundary, rejection of unpublished locales and metadata contracts; they do not establish a completed Spanish implementation or a clean integration build.

## Exact snapshots and measured denominators

| Snapshot | Exact SHA | Canonical public routes | ES route mappings | ES source coverage | All page templates | ES page templates |
|---|---|---:|---:|---:|---:|---:|
| HEAD | b7891662ff98de1d14bfe514a08bd85fcb97a2dd | 43 | 0 | 0.00% | 286 | 0 |
| origin/main | 63a0e0f550f65b4beb3c52afabdba0481b510e69 | 42 | 0 | 0.00% | 275 | 0 |
| website/spanish-public-completion-20261108 | 13a3485bb8a6ec8af720ec579bcf6b357003dec6 | 42 | 42 | 100.00% | 316 | 41 |
| website/watchtowers-ribagorza-20261109 | 582acc889afbe59991ea307bc5e4a2b986b11c0e | 45 | 45 | 100.00% | 322 | 44 |

The canonical denominator is the exact array in lib/navigation/route-visibility.ts at each SHA. Page templates include redirects, dynamic templates and protected pages; they are not a count of distinct reachable URLs. ES templates include /es/unavailable and one dynamic article template, so template and mapping counts intentionally differ. English source ownership is 100% of each snapshot's canonical array; that is not a claim of approved legal content or working protected workflows.

## Locale availability and exact unfinished causes

| Locale | Public mapping coverage on latest website candidate | Product-wide completion | Demonstrated cause / release treatment |
|---|---:|---|---|
| English (en) | 45/45 = 100% source ownership | Unmeasured; not certified | Eleven canonical legal/policy/company pages publish review notices. Positive form delivery, account, billing, email, SOC and provider flows need separate runtime checks. |
| Spanish (es) | 45/45 = 100% source ownership | Incomplete | 11/45 routes translate an unavailable/review notice, not the underlying approved content; account/demo/download tools explicitly remain English; no complete protected-app catalogue. 34/45 = 75.56% is the maximum non-notice public ownership ratio, not a semantic review completion score. |
| French (fr) | 0/45 = 0% | Incomplete | No public registry entry or route owners; disabled in selector. Supplier pilot configuration permits fr and translates limited configuration/approval/execution labels only (docs/tenente/INTEGRATED-LOCAL-CAPABILITIES.md, lib/supplier-pilot/capability-contracts.ts). Full product translation is not claimed. |
| German (de) | 0/45 = 0% | Incomplete | Disabled selector item only; no registered public equivalents or route owners. |
| Portuguese (pt) | 0/45 = 0% | Incomplete | Disabled selector item only; no registered public equivalents or route owners. |
| Italian (it) | 0/45 = 0% | Incomplete | Disabled selector item only; no registered public equivalents or route owners. |
| Arabic (ar) | 0/45 = 0% | Incomplete | Disabled selector item only; no registered public equivalents, RTL implementation or route owners found. |
| Chinese (zh) | 0/45 = 0% | Incomplete | Disabled selector item only; no registered public equivalents or route owners. |

The six disabled languages are explicitly described as unavailable, rather than advertised as working translations. PublicLocale remains en/es. Country configuration is not inferred locale support. No percentage for human translation review is invented: review sign-off identities and complete string denominators are absent from this audit. The website candidate documentation claims 1,108 reviewed catalogue messages and 26 translated OpenAPI operation summaries; these cover the generator's selected public source corpus, not every product string.

## Per-route public matrix at 582acc889afbe59991ea307bc5e4a2b986b11c0e

French, German, Portuguese, Italian, Arabic and Chinese have no published owner for **every** row below (0/45 each). At HEAD and origin/main, Spanish has no published owner for any canonical row. Candidate entries must not be described as already integrated into main.

| Canonical route | English | Spanish candidate route | Qualification limit |
|---|---|---|---|
| /tenente-swarm | EN source | /es/tenente-swarm | Translation source present; current runtime unqualified |
| /tenente-swarm/torch-code | EN source | /es/tenente-swarm/torch-code | Translation source present; current runtime unqualified |
| /tenente-swarm/river-crossing | EN source | /es/tenente-swarm/river-crossing | Translation source present; current runtime unqualified |
| / | EN source | /es | Translation source present; current runtime unqualified |
| /platform | EN source | /es/platform | Translation source present; current runtime unqualified |
| /solutions | EN source | /es/solutions | Translation source present; current runtime unqualified |
| /trust | EN source | /es/trust | Translation source present; current runtime unqualified |
| /trust/data-sovereignty | EN source | /es/trust/data-sovereignty | Translation source present; current runtime unqualified |
| /verification-replay | EN source | /es/verification-replay | Translation source present; current runtime unqualified |
| /enterprise | EN source | /es/enterprise | Translation source present; current runtime unqualified |
| /enterprise/agent-governance | EN source | /es/enterprise/agent-governance | Translation source present; current runtime unqualified |
| /enterprise/buyer-documentation | EN source | /es/enterprise/buyer-documentation | Translation source present; current runtime unqualified |
| /enterprise/hiring-security | EN source | /es/enterprise/hiring-security | Translation source present; current runtime unqualified |
| /enterprise/pilot | EN source | /es/enterprise/pilot | Translation source present; current runtime unqualified |
| /enterprise/pilot-checklist | EN source | /es/enterprise/pilot-checklist | Translation source present; current runtime unqualified |
| /developers | EN source | /es/developers | Translation source present; current runtime unqualified |
| /developers/docs | EN source | /es/developers/docs | Translation source present; current runtime unqualified |
| /developers/authentication | EN source | /es/developers/authentication | Translation source present; current runtime unqualified |
| /developers/api-reference | EN source | /es/developers/api-reference | Translation source present; current runtime unqualified |
| /developers/quickstart | EN source | /es/developers/quickstart | Translation source present; current runtime unqualified |
| /governance | EN source | /es/governance | Translation source present; current runtime unqualified |
| /resources/agent-security | EN source | /es/resources/agent-security | Translation source present; current runtime unqualified |
| /resources/agent-security/agent-authorization | EN source | /es/resources/agent-security/agent-authorization | Translation source present; current runtime unqualified |
| /resources/agent-security/mcp-tool-authorization | EN source | /es/resources/agent-security/mcp-tool-authorization | Translation source present; current runtime unqualified |
| /resources/agent-security/synthetic-interaction-trust | EN source | /es/resources/agent-security/synthetic-interaction-trust | Translation source present; current runtime unqualified |
| /documents | EN source | /es/documents | Translation source present; current runtime unqualified |
| /documents/operational-trust-whitepaper | EN source | /es/documents/operational-trust-whitepaper | Translation source present; current runtime unqualified |
| /pricing | EN source | /es/pricing | Translation source present; current runtime unqualified |
| /methodology | EN source | /es/methodology | Translation source present; current runtime unqualified |
| /journal | EN source | /es/journal | Translation source present; current runtime unqualified |
| /regulatory | EN source | /es/regulatory | Translated publication notice; underlying approved content absent |
| /media-centre | EN source | /es/media-centre | Translated publication notice; underlying approved content absent |
| /about | EN source | /es/about | Translation source present; current runtime unqualified |
| /about/mission | EN source | /es/about/mission | Translation source present; current runtime unqualified |
| /our-people | EN source | /es/our-people | Translated publication notice; underlying approved content absent |
| /careers | EN source | /es/careers | Translated publication notice; underlying approved content absent |
| /enterprise-access | EN source | /es/enterprise-access | Translation source present; current runtime unqualified |
| /help | EN source | /es/help | Translation source present; current runtime unqualified |
| /accessibility | EN source | /es/accessibility | Translated publication notice; underlying approved content absent |
| /privacy | EN source | /es/privacy | Translated publication notice; underlying approved content absent |
| /terms | EN source | /es/terms | Translated publication notice; underlying approved content absent |
| /cookies | EN source | /es/cookies | Translated publication notice; underlying approved content absent |
| /legal | EN source | /es/legal | Translated publication notice; underlying approved content absent |
| /modern-slavery | EN source | /es/modern-slavery | Translated publication notice; underlying approved content absent |
| /security | EN source | /es/security | Translated publication notice; underlying approved content absent |

## Required product surfaces outside the public mapping denominator

| Required surface | Traceable source / route | English | Spanish / remaining languages |
|---|---|---|---|
| Homepage, navigation, footer | app/page.tsx; app/layout.tsx; components/global-navigation.tsx; components/public-language-selector.tsx on website branches | Source present | Candidate Spanish shell/source; fresh desktop/mobile/a11y qualification pending |
| TENENTE SWARM, TORCH, River Crossing | /tenente-swarm; /tenente-swarm/torch-code; /tenente-swarm/river-crossing on website/watchtowers-ribagorza | Source + historical six-route HTTP smoke | ES source + historical HTTP smoke; current interactive completion unqualified |
| SOC console / TrustOps | app/trustops/page.tsx; app/command-center/page.tsx | Source present, workflow qualification separate | No published translated route owners |
| Agent Registry | app/agent-registry/page.tsx; app/agent-registry/[id]/page.tsx | Source present | No published translated route owners |
| Authority Graph | Protected authority/SWARM graph components (inventory report identifies runtime owner) | Source presence does not certify workflow | No public locale ownership or complete translated protected catalogue |
| Evidence Vault / Replay | app/trust-replay/page.tsx; app/dashboard/replay/page.tsx; app/dashboard/replay/[entityId]/page.tsx | Source present | Explicit English fallback for /trust-replay; translated public /verification-replay is explanatory content |
| Onboarding | /login; /verify/candidate; /verify/session; /enterprise-access | Public source/candidate form | Protected account tools remain English; enterprise-access public form translated in candidate |
| Billing | app/billing/page.tsx | Source present | No translated owner; /es/pricing does not localize billing |
| Forms, validation and errors | Public enterprise-access candidate; account/reset-password; protected error.tsx | Source present | Only selected public form copy translated; complete protected validation/error inventory and review missing |
| Emails / notifications | Transactional templates and supplier notification operations | No full language qualification conducted | No complete per-locale template catalogue or delivery evidence established |
| Legal / security | Eleven notice routes listed above; privacy preference/account controls | Publication approval absent for underlying text | Spanish notice truthfully states missing approved text; does not satisfy finished legal-content translation |
| Metadata, sitemap, hreflang | lib/i18n/public-locales.ts; app/sitemap.ts; lib/i18n/es-metadata.ts on candidate | Canonical owners | Reciprocal en/es source; no other locale hreflang; fresh hosted HTML pending |

## Selector assessment and evidence boundaries

Candidate components/public-language-selector.tsx implements two selectable buttons, six disabled unavailable options, aria-expanded/current-language labels, arrow/Home/End focus movement, Escape focus restoration and outside-click closure. components/global-navigation.tsx transitions with window.location.assign(localizedPublicHref(...)) so the root document language refreshes; query and hash are preserved. The candidate locale resolver returns /es/unavailable for supported English-only paths rather than silently presenting English as Spanish. URL choice persists through localized links and reload; no persistent storage preference across a fresh unprefixed visit is implemented in the inspected selector. No IP or Accept-Language forced redirect was found in this source assessment.

These source observations do not prove screen-reader behavior. The historical website-browser-final-head-13a3485-20261108.log reports 84 HTTP checks, 172 browser assertions, 114 links, zero page errors and public-rendering pass at 13a3485; it also records /api/consent/cookies HTTP 403 and therefore cannot establish consent persistence. watchtower-final-preview-smoke-20261109.json records HTTP 200 for six en/es demo routes but contains no exact deployment SHA or full interaction proof. production-readonly-20261108.json explicitly states deployed SHA not established and checks only five English public pages. Current Production language coverage is therefore **UNKNOWN**, not 100% or 0%.

## Focused fixes and release gates

1. Integrate and requalify the existing website candidate at an exact dependency-resolved SHA instead of regenerating translations on the old HEAD. Preserve authentication guards and honest unavailable notices.
2. Obtain content-owner approval for the eleven English legal/policy/company pages, then translate that approved content and record reviewer identities. Do not count translated review notices as finished policies.
3. Define the protected application translation corpus (SOC, registry, authority, evidence, onboarding, billing, validation, email) and introduce reviewed dictionaries per route. Keep ALLOW / REVIEW / DENY, scopes, API fields and persisted evidence unchanged.
4. On English-only routes, disable an unavailable locale transition with an explanation or link to the explicit unavailable page; never route into an English duplicate marked Spanish. Keep the six other languages unavailable until reviewed route owners exist. Removing the disabled roadmap list is a product decision, not a prerequisite to truthfulness.
5. Add an explicit preference persistence policy for fresh visits if required, without overriding a visitor's chosen URL or changing auth callbacks based on location.
6. Run the existing generation --check, public-i18n and spanish-public-completion contracts at the integrated SHA, then built-site desktop/mobile keyboard, screen-reader, HTML language, metadata, sitemap and form tests. Re-run hosted public read-only checks bound to that SHA; positive forms/consent/account/billing need the authorized isolated staging setup.

Reproduce the source measurement with node tools/audit/localization-inventory-20261112.mjs. This audit creates only new report/script files and does not alter branches, existing translations or hosted systems.
