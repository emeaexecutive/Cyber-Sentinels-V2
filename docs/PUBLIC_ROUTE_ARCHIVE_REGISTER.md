# Public Route Archive Register

RC3 does not delete working routes. It records public ownership, redirect state, protection and deferred deletion so consolidation remains reversible and safe.

| Route | Classification | Canonical public owner | Indexing/protection | RC3 decision |
| --- | --- | --- | --- | --- |
| `/about-us` | Duplicate public route | `/about` | Permanent redirect; absent from sitemap | REDIRECT |
| `/reality-os` | Legacy product framing | `/platform` | Permanent redirect; absent from sitemap | REDIRECT |
| `/trust-os` | Legacy product framing | `/platform` | Permanent redirect; absent from sitemap | REDIRECT |
| `/trust-fabric` | Duplicate architecture framing | `/platform#trust-fabric` | Permanent redirect; absent from sitemap | REDIRECT |
| `/trust-center` | Authenticated operations | Itself | Middleware auth plus noindex | AUTHENTICATED_ONLY |
| `/trust-timeline` | Experimental operational timeline | Protected Replay/Trust Memory tooling | Admin protection plus noindex | ARCHIVE_FOR_LATER |
| `/trust-graph` | Experimental graph surface | `/trust#evidence-audit` publicly | Admin protection plus noindex | ARCHIVE_FOR_LATER |
| `/trust-graph-engine` | Admin graph engine | Itself | Admin protection plus noindex | ADMIN_ONLY |
| `/trust-graph-explorer` | Experimental graph exploration | Protected graph tooling | Admin protection plus noindex | ARCHIVE_FOR_LATER |
| `/architecture` | Internal architecture tooling | `/platform#trust-fabric` publicly | Admin protection plus noindex | ADMIN_ONLY |
| `/operational-trust` | No current page | Homepage | Not emitted | DEPRECATE_AFTER_RC1 |
| `/support` | No public page; API/admin support exists | `/help` publicly | Protected operational endpoints preserved | HIDE_FROM_NAVIGATION |

Deletion requires a later usage, data, inbound-link and authorization audit. Protected operational tools must never be redirected to marketing pages.
