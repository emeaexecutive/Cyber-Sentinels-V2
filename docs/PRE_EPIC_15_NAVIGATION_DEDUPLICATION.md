# Pre-Epic 15 Navigation Deduplication

## Purpose

The public header now orients buyers while the footer owns detailed exploration. No route was removed, redirected or reclassified, and authenticated/admin navigation remains outside this public discovery change.

## Header correction

Before, the public header exposed Platform, Solutions, Trust, Enterprise, Developers and Resources through dropdown discovery, alongside Pricing and Sign In. Detailed child destinations therefore repeated links already available in the footer.

After, desktop and mobile render the same six direct actions from one shared link model:

| Label | Route |
| --- | --- |
| Platform | `/platform` |
| Solutions | `/solutions` |
| Trust | `/trust` |
| Enterprise | `/enterprise` |
| Pricing | `/pricing` |
| Sign In | `/login` |

Dropdown controls, dropdown children, Developers and Resources were removed from the header only. Their routes remain available through the footer, in-page links, sitemap policy and direct navigation.

## Footer correction

The footer retains seven detailed discovery groups: Platform, Trust, Solutions, Enterprise, Developers & Resources, Company, and Legal & Support.

Removed landing-page duplicates:

- Platform Overview;
- Solutions Overview;
- Trust Center;
- Enterprise Overview;
- Pricing;
- Sign In.

Security is retained once under Enterprise and removed from Legal & Support. Developers & Resources now combines the developer entry points with Methodology, Journal and Regulatory Material. Every group is one labelled semantic navigation region inside a responsive two-, four- and seven-column layout.

## Preserved boundaries

- Public child routes remain implemented.
- The mobile menu and desktop header share the same six-link array.
- Authenticated user navigation remains Enterprise Workspace, Notifications and Logout, with Verify Admin for unverified administrators.
- Verified admin navigation remains Enterprise Workspace, Notifications, Administration and Logout.
- No authenticated or admin route was added to the public header or footer.

## Verification contract

`tests/public-surface-navigation.test.mjs` verifies the exact header inventory, absence of dropdowns, header/footer route-and-label deduplication, single Security placement, unchanged authenticated/admin branches, shared mobile/desktop links, responsive footer structure and required documents.
