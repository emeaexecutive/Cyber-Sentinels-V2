# Execution06 treasury demonstration

Source189601d51392447ef54e992a1fda088d508330b3. Run commands from tmp/execution06-treasury. Reproduce: npm run test:treasury; npm run demo:treasury; npm run test:treasury-browser. To keep the local console open: node --import tsx tools/treasury/demo.mjs --serve. Bindings are loopback-only and all financial effects are synthetic.

Final executable demonstration exports artifacts/execution06-treasury/6c83c405-9e91-4bd8-88f1-6d44d0876186. It uses actual local HTTP requests and crash-recoverable file CAS, with declared identity/human/authority fixtures. It is not a real external payment.

- EUR50,000 ALLOW initially has zero destination effects; controlled commit yields one independently read ledger effect and signed execution evidence.
- A second EUR50,000 request remains REVIEW with no new effect until two independent current fixture humans approve; it then commits once.
- A revoked agent is DENY and creates no additional effect.
- Two agents compete for the final EUR50,000 allowance: one admitted, one denied. Unavailable gateway creates zero effects. A dropped response after commitment is client UNKNOWN; independent read proves one synthetic effect. Reused authorization is DENY with no reexecution.

13/13 automated tests pass, zero skips. They cover all ten requested negative categories, additional currency/asset/network/provider substitution, cyclic/revoked/invalid authority, expired mandates, cross-provider shared limits, midnight reservations, malformed amounts, revoked approver, receipt/export forgery/truncation and a stale-check/revocation-before-commit interleaving. File CAS clients are independent stores on one local filesystem; not hosted PostgreSQL connections.

Browser checks pass EN/ES at390px and1440px: locale persists on reload, document language changes, no overflow or page errors. Screenshots and result JSON are in artifacts/execution06-treasury/browser. This console is local and separate from protected SaaS, with raw evidence identifiers intentionally visible.

Export verification: node --import tsx tools/treasury/verify-export.mjs <bundle.json> <independently-pinned-public-key.pem> <independently-pinned-checkpoint.json>. The export signs every Replay event and a head/count/effects-digest checkpoint, and verifies one-to-one destination-effect evidence. The bundle cannot choose its own trust anchor. Repository artifacts are not an external timestamp/transparency service; malicious disk rollback still needs an externally retained checkpoint.

Full SaaS Evidence Vault projection, hosted KYA API/SDK and authenticated Trust Operations integration remain PARTIAL/NOT BUILT. No real-money pilot is qualified.

