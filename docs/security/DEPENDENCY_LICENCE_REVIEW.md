# Dependency licence review

> Technical licence inventory only. Legal interpretation remains subject to specialist review.

## Inventory result

The deterministic inventory at `artifacts/security/dependency-license-inventory.json` covers all 466 locked package instances and their available integrity hashes.

| Classification | Package instances | Review result |
| --- | ---: | --- |
| Permissive | 451 | MIT, Apache-2.0, ISC, BSD, BlueOak, Python-2.0 and Creative Commons metadata recorded |
| Reciprocal | 15 | Fourteen Sharp/libvips platform packages include LGPL-3.0-or-later; `axe-core` uses MPL-2.0 |
| Strong copyleft | 0 | No GPL/AGPL metadata found |
| Source-available | 0 | No SSPL/BUSL metadata found |
| Unknown/custom | 0 | No missing or unclassified licence metadata found |

The reciprocal packages are transitive: Sharp/libvips supports Next.js image processing across optional platforms, and `axe-core` is development tooling. This inventory does not determine distribution obligations or commercial compatibility; specialist legal review remains the approval boundary.

## Controls

- The inventory is regenerated from `package-lock.json` by `npm run security:sbom`.
- SBOM and inventory files contain no environment variables, credentials, private tokens, home directories or absolute local paths.
- Future GPL, AGPL, SSPL, BUSL, unknown or custom findings require explicit owner and specialist review before merge.
