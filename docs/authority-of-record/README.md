# Local Authority of Record / TENENTE qualification

This is an isolated feature implementation, not a release promotion. See [the A–V report](IMPLEMENTATION_REPORT.md), [28-case matrix](TEST_MATRIX.md), [database evidence](LOCAL_QUALIFICATION.json), and [effective schema evidence](LOCAL_SCHEMA_QUALIFICATION.json).

## Reproduce safely

Use branch `feat/authority-of-record-tenente`, Node 22.23.1 and the existing locked dependencies. No new dependencies were introduced. The qualification scripts never load environment files or remote credentials, and connect only to `127.0.0.1:55439`.

The recorded run used Docker Engine 29.7.2 / Compose 5.5.0 and `public.ecr.aws/supabase/postgres:17.6.1.165`, container `cs-aor-tenente-local`, label `cybersentinels.workstream=authority-of-record-tenente`, host binding `127.0.0.1:55439:5432`. The image reports PostgreSQL 17.6. Docker Desktop initially was stopped (missing `dockerDesktopLinuxEngine` pipe); `docker desktop start` recovered it.

The container contains synthetic data only. Local trust authentication was set in this container's `/etc/postgresql/pg_hba.conf` for its disposable database; it is not appropriate for shared infrastructure. Do not reuse a hosted database or change another container's authentication. The loopback mapping restricts host access; the Docker network is also a trust boundary. No container/volume pruning is required. After qualification this label-verified container was stopped, with all synthetic databases retained; use `docker start cs-aor-tenente-local` before rerunning.

The schema prerequisite is the recorded schema-only catalog `tmp/recovery-closure/staging-catalog.json`, SHA-256 `7db49a022b24d470bde44c6e8f16e2a20ae9d3334bc220f392ca43b5177ef4e2`. It was already available locally and is deliberately not committed as a dump. A fresh checkout alone lacks this prerequisite. The setup helper accepts an explicit catalog path; it never downloads a hosted schema. It restores recorded application ownership and applies migrations absent from the catalog ledger through the image's administrative migration role.

With the dedicated container running and the catalog present:

```powershell
$env:AOR_LOCAL_DATABASE = 'aor_qualification_recheck1'
node tools/qualification/setup-authority-of-record-local.mjs
npm run qualify:authority-of-record:local
npm run test:authority-of-record
npm run test:external-agent-platform
npm run lint
npm run typecheck
npm test
npm run build
```

Choose a new database name each time: setup refuses existing databases and never resets them. Qualification writes the two committed evidence JSON paths; inspect those changes after rerunning. Intermediate failed setup databases are retained in the dedicated disposable container. No Production dump or credentials are used.

## Runtime configuration and protocol boundary

The native delegated-action request accepts bounded `parameters`. The server freezes the full action and computes its SHA-256 payload digest. `TENENTE_TOOL_ADAPTERS` is an operator-controlled JSON map from tool name to `{ endpoint, transport: "http" | "mcp" }`; it is not a client-supplied destination. HTTPS is required, except explicit loopback in development. The existing `NATIVE_DESTINATION_EVIDENCE_KEY` protects dispatch and destination evidence. Never place secrets in action parameters or commit key material.

The destination must validate the HMAC/freshness, bind the tenant/transaction/tool/payload, check current authority, and atomically consume the durable idempotency identity with its business effect. `verifyToolDispatch` checks integrity and freshness only; it is not an authorization decision or durable replay store. The local qualification target demonstrates these additional controls with a real PostgreSQL business-effect ledger. A generic external target is not safe merely because it can return HTTP 200.

MCP support here is bounded JSON-RPC `tools/call` with exact ID matching and signed structured evidence. It is not a complete MCP session/initialization/discovery client. No named external provider is certified by this run.

`AUTHORITY_RECEIPT_PRIVATE_KEY_FILE` and `AUTHORITY_RECEIPT_KEY_ID` enable server-side Ed25519 receipt export. Both absent produces explicit `NOT_CONFIGURED`; incomplete configuration fails. A verifier must pin the appropriate public key out of band and remove `cryptographic_verification` and transport-added `request_id` / `api_version` before verifying the canonical payload. A signed historical receipt does not grant permission to execute again. Local tests generate keys in memory; no signer was configured in shared infrastructure. Public key discovery, KMS custody and rotation remain unqualified.

The additive public `action.exact_scope` contract binds tool/provider/data scope/payload digest and optional integer amount/currency to the decision request. That public path intentionally remains REVIEW with `EXACT_TOOL_EXECUTION_PATH_REQUIRED`, because the legacy relay has not been qualified for this exact execution contract. Use of the fields cannot manufacture an ALLOW or trigger the legacy relay.
