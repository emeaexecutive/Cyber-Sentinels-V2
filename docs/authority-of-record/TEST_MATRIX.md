# Authority of Record / TENENTE test disposition

Date: 2026-10-08. All evidence below is local. Coverage of a requirement is not qualification of every API, provider or user journey. The overall delivery is **PARTIAL**.

`AOR` = `tests/authority-of-record-tenente.test.mjs`; `HTTP` = `tests/authority-of-record-http.test.mjs`; `DB` = `tools/qualification/authority-of-record-local.mjs` and its committed `LOCAL_QUALIFICATION.json`. Existing suites were rerun through `npm test`.

| # | Planned requirement | Executed evidence and boundary |
|---|---|---|
| 1 | Valid authority ALLOW | AOR valid graph; DB native evaluator -> actual reservation RPC -> HTTP destination, one durable effect. Identity setup is synthetic. |
| 2 | Missing authority DENY | Existing canonical/native negative suites fail closed. A missing authority can return an error rather than a decision receipt. No new authenticated destination-counter journey for this case. |
| 3 | Revoked authority DENY | AOR parent/delegation cases; DB revocation followed by DENY and zero new effects. |
| 4 | Expired delegation | AOR exact expiry rejects; existing native suites. No newly exercised delegation-expiry race at a live application endpoint. |
| 5 | Wrong resource | AOR rejects target change; DB rejects action payload different from its canonical transaction before dispatch. |
| 6 | Wrong tool | AOR tool restriction; exact payload digest includes native tool; HTTP rejects changed authorized payload before network. Registry selection is server controlled. No external provider qualification. |
| 7 | Wrong environment | AOR environment restriction and review digest mutation; DB reservation binds canonical environment. Public bearer-token cross-environment journey was not newly qualified. |
| 8 | Value threshold | AOR amount bounds, non-finite/negative values; DB actual 100 versus authorized 100 and injected actual 1000. Currency mutation changes public review digest. Native synthetic amounts are numerical units, not a real euro transfer or FX implementation. |
| 9 | Child exceeds parent | AOR child limit expansion; existing subset/depth/native delegation suites. |
| 10 | Prohibited delegation | AOR root cannot-delegate rejection; existing redelegation/depth suite. |
| 11 | REVIEW executes zero | AOR dependencies must not be invoked; DB unresolved REVIEW produces zero downstream effects. |
| 12 | Approval exact scope | AOR changes to tool/payload/amount/currency/environment invalidate original digest. Existing native approval tests; DB governed resolution leaves original REVIEW unchanged. Public exact_scope stays REVIEW; a complete public approve -> fresh ALLOW -> execution journey remains unqualified. |
| 13 | Unauthorized reviewer | Actual local review RPC rejects unauthorized reviewer; authorized reviewer resolves via existing governed workflow. |
| 14 | DENY executes zero | AOR forbids all execution dependencies; DB revoked request has zero new effects. |
| 15 | Replay rejection | Existing native challenge replay tests; HTTP rejects stale/forged dispatch; DB duplicate retry has no effect, two concurrent database reservations yield one new request, changed reuse fails. No claim of universal exactly-once delivery to arbitrary providers. |
| 16 | Cross-tenant authority | AOR principal/tenant rejection; DB other tenant cannot mutate authority or read execution records. |
| 17 | Execution mismatch | DB controlled target really stores actual amount 1000 for authorized 100; signed evidence yields contradiction with UNKNOWN outcome, not trusted success. Existing outcome integrity suites rerun. |
| 18 | Receipt persistence | DB canonical transaction/request/observation/outcome persist; historical stored projection is signed and verified. Signatures are generated on export, not separately persisted in a second receipt store. No hosted receipt retrieval proof for this feature. |
| 19 | Historical Replay | DB compares historical ALLOW after revocation; unchanged. Existing historical Replay/authority-integrity suites rerun. |
| 20 | Memory lifecycle | DB atomic suspension/revocation appends existing native Replay and Trust Memory; existing lifecycle suites rerun. Newly injected outcome anomaly is stored in native outcome evidence; the entire UI chronology is not browser verified. |
| 21 | Golden flow | DB native ALLOW -> one HTTP effect -> retry zero -> revocation -> DENY zero -> historical evidence unchanged. Setup uses synthetic fixtures/direct canonical inserts, not the full authenticated administrator/API journey. |
| 22 | Security regression | Full regression and actual local RLS/RPC tests. Prior hosted evidence is not relabelled as feature qualification. |
| 23 | Parent revoked | AOR root and ancestor revocation; current ancestor checks also implemented in reservation SQL. No new concurrent ancestor-revocation destination race proof. |
| 24 | Parent expired | AOR parent expiry; SQL dispatch checks. Actual DB policy-expiry-after-ALLOW race separately proves policy invalidation. Parent-expiry-at-dispatch test remains narrower unit coverage. |
| 25 | APPROVED wrong tenant | Actual database authenticated role with approved account in another tenant reads zero protected execution rows. |
| 26 | PENDING no access | Actual database pending token reads zero rows and cannot restrict authority; existing account approval/default-deny suites rerun. |
| 27 | Forged claims | Actual authenticated RPC cannot impersonate administrator; unsigned direct target request rejected; HTTP rejects forged dispatch/evidence; existing API claim-security suites rerun. |
| 28 | Receipt tamper | Real ephemeral Ed25519 key pair and pinned public key. Decision/amount/outcome/tenant/key/algorithm tampering fails verification. HTTP rejects invalid destination HMAC. Production signer operations not qualified. |

Additional checks: suspended authority, unknown runtime -> REVIEW, credential revocation after ALLOW, policy expiry after ALLOW, acceptance principal/fingerprint binding, cycles/ancestor containment, exact reservation collision, secret-bearing executable parameters, HTTP redirects, endpoint userinfo/plaintext rejection, response-size limit and MCP response ID mismatch. The dedicated feature suite contains 40 tests; DB/HTTP qualification records 25 checks separately.
