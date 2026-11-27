# Public website audit ? 20 October 2026

Scope: public navigation, linked capability/documentation/API pages, metadata/sitemap/robots, desktop 1440?1000 and mobile 390?844 Platform/About captures, and the local candidate. This is not a full accessibility or authenticated onboarding qualification.

1. Public route/link audit: 41 requested public routes returned HTTP 200, including robots and sitemap. Successful HTTP responses are not proof that every form or provider integration works. Evidence: `cpto-evidence-20261020/public-http.json`.
2. Public Platform and About: one H1 on each, no horizontal document overflow at either width. Existing content and capability links were retained. Mobile navigation remains collapsed under Menu; screenshots alone do not qualify every keyboard interaction.
3. Local Our Story: preserves the approved Arag?n origin, bounded delegated-guardianship inspiration and ?Authority can be delegated. It cannot be invented.? Adds `#our-story` and a link to Platform / Swarm Security. Existing user-authored story content was preserved, not newly invented in this run.
4. Local Platform: explicit AVAILABLE / BETA / UNDER DEVELOPMENT / NOT YET PRODUCTION-QUALIFIED labels, controlled-boundary and simulated-spending limitations. The first capture revealed the new H2 section preceded the main introduction; it was moved below the H1 introduction.
5. Privacy notice: rejecting optional cookies displays a dismissible synchronization status. In the synthetic local environment the server rejected the receipt; on the public page it was pending when captured. These are not successful consent-persistence qualification results. The initial capture interaction initiated an incidental application POST; subsequent hosted captures must block non-GET traffic.

Metadata uses the existing canonical/social helpers; About remains served through its existing canonical route. No public capability pages, footer sections or completed features were removed. No replacement marketing claim of Production-qualified swarm control was introduced.

Accepted screenshots and DOM measurements are in the companion evidence directory. They show visible layout only; contrast, screen-reader operation, authenticated login, Turnstile, consent persistence and hosted operator actions require separate focused qualification. No website deployment was performed.

Final rebuilt-candidate capture passed at both widths: no horizontal overflow, one H1, canonical metadata preserved, corrected heading order, readable status labels and Our Story. Local mobile Menu opened and exposed Sign In. All non-GET/HEAD requests were blocked before network dispatch during this final pass (two per public context, one per local context). The inspected PNGs are `cpto-evidence-20261020/final-*.png`; DOM results are `browser-final.json`.
