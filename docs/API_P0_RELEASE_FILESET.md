# API P0 release file set

This file records the exact intended release-candidate paths. Review the diff, then run these commands manually only if the human release owner decides to stage the candidate. This work did not run them.

## Configuration and product entry points

```powershell
git add -- '.env.example' 'README.md' 'package.json'
```

## Public API, readiness, and protected server routes

```powershell
git add -- 'app/api/developer/api-keys/route.ts' 'app/api/ready/route.ts' 'app/api/operational-entities/route.ts' 'app/api/trust/execute/route.ts' 'app/api/admin/reviews/route.ts' 'app/api/v1/agents/route.ts' 'app/api/v1/agents/[agentId]/route.ts' 'app/api/v1/agents/[agentId]/authority/route.ts' 'app/api/v1/agents/[agentId]/authorities/route.ts' 'app/api/v1/agents/[agentId]/authorities/[authorityId]/route.ts' 'app/api/v1/agents/[agentId]/authorities/[authorityId]/revoke/route.ts' 'app/api/v1/agents/[agentId]/challenge/route.ts' 'app/api/v1/agents/[agentId]/credentials/route.ts' 'app/api/v1/agents/[agentId]/manifest/route.ts' 'app/api/v1/agents/[agentId]/proof/route.ts' 'app/api/v1/agents/[agentId]/trust-state/route.ts' 'app/api/v1/evidence/route.ts' 'app/api/v1/reviews/[reviewReference]/route.ts' 'app/api/v1/reviews/[reviewReference]/resolve/route.ts' 'app/api/v1/trust/decisions/route.ts' 'app/api/v1/trust/transactions/[transactionId]/route.ts' 'app/api/v1/trust/transactions/[transactionId]/receipt/route.ts' 'app/api/v1/trust/transactions/[transactionId]/replay/route.ts' 'app/api/v1/trust/transactions/[transactionId]/outcomes/route.ts'
```

## Canonical customer and developer surfaces

```powershell
git add -- 'app/dashboard/page.tsx' 'app/dashboard/error.tsx' 'app/dashboard/decisions/page.tsx' 'app/dashboard/reviews/page.tsx' 'app/dashboard/replay/page.tsx' 'app/dashboard/replay/[entityId]/page.tsx' 'app/evidence-vault/page.tsx' 'app/operational-entities/page.tsx' 'app/admin/reviews/page.tsx' 'app/developers/page.tsx' 'app/developers/api-keys/page.tsx' 'app/developers/api-keys/api-key-manager.tsx' 'app/developers/authentication/page.tsx' 'app/developers/docs/page.tsx' 'app/developers/quickstart/page.tsx'
```

## Canonical runtime and authorization libraries

```powershell
git add -- 'lib/auth/isAdmin.ts' 'lib/env.ts' 'lib/identity-signals/ui-enterprise.ts' 'lib/operational-entities/federated-evidence.ts' 'lib/public-api/v1/api-key-crypto.ts' 'lib/public-api/v1/api-key-lifecycle.ts' 'lib/public-api/v1/authentication.ts' 'lib/public-api/v1/contracts.ts' 'lib/public-api/v1/environment.ts' 'lib/public-api/v1/handler.ts' 'lib/public-api/v1/openapi.ts' 'lib/public-api/v1/runtime.ts' 'lib/trust-transaction/server.ts' 'src/lib/trust-transaction/canonical.ts'
```

## Migrations

```powershell
git add -- 'supabase/migrations/20260829094528_harden_public_api_rate_limit_isolation.sql' 'supabase/migrations/20260829164824_close_public_api_customer_zero.sql'
```

## SDK, Customer Zero, and examples

```powershell
git add -- 'packages/cyber-sentinels-sdk/LICENSE' 'packages/cyber-sentinels-sdk/README.md' 'packages/cyber-sentinels-sdk/package.json' 'packages/cyber-sentinels-sdk/src/index.ts' 'examples/agent-gamma/README.md' 'examples/agent-gamma/gamma.mjs' 'examples/powershell/README.md' 'examples/powershell/agent-gamma.ps1'
```

## Contract, operations, and sanitized evidence templates

```powershell
git add -- 'docs/EXTERNAL_AGENT_QUICKSTART.md' 'docs/API_P0_PRODUCTION_PROMOTION_CLOSURE.md' 'docs/API_P0_RELEASE_FILESET.md' 'docs/API_V1_CONTRACT.md' 'docs/API_V1_CUSTOMER_ERROR_GUIDE.md' 'docs/API_V1_INTEGRATION_CHECKLIST.md' 'docs/API_V1_RELEASE_CHECKLIST.md' 'docs/API_V1_STAGING_DEPLOYMENT_MANIFEST.md' 'artifacts/v1-api-release-evidence-manifest.json'
```

## Tests and bounded qualification tools

```powershell
git add -- 'tests/agent-gamma-boundary.test.mjs' 'tests/canonical-trust-transaction.test.mjs' 'tests/cyber-sentinels-sdk.test.mjs' 'tests/external-agent-client-parity.test.mjs' 'tests/live/staging-rls-governance.test.mjs' 'tests/powershell-agent-gamma.test.mjs' 'tests/production-domain-readiness.test.mjs' 'tests/public-api-v1-openapi.test.mjs' 'tests/public-api-v1-security.test.mjs' 'tools/release/run-live-rls-governance.ts' 'tools/release/scoped-secret-scan.mjs' 'tools/v1-api-performance.mjs'
```

## Explicitly excluded stale/local proof paths

Do not stage these as part of this release candidate:

- `artifacts/production-proof.json`
- `artifacts/v1-release-candidate-manifest.json`
- `docs/V1_RELEASE_CANDIDATE_QUALIFICATION.md`
- `tools/production-proof-local.mjs`

They describe an earlier dirty-worktree qualification or local proof and must not be presented as exact-SHA hosted evidence.
