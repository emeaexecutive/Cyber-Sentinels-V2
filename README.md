# Cyber Sentinels

Cyber Sentinels is a server-side trust-decision service for external AI agents. An integrating system registers and verifies an agent, reads its current authority, and asks the V1 API whether one exact proposed action is `ALLOW`, `REVIEW`, or `DENY`. Cyber Sentinels records the canonical decision and exposes a receipt and chronological Replay; it does not execute the action for the customer.

## Public V1 integration

- Customer quickstart: [`docs/EXTERNAL_AGENT_QUICKSTART.md`](docs/EXTERNAL_AGENT_QUICKSTART.md)
- OpenAPI 3.1: `GET /api/v1/openapi.json` on the approved host
- Contract and operating semantics: [`docs/API_V1_CONTRACT.md`](docs/API_V1_CONTRACT.md)
- Customer error guide: [`docs/API_V1_CUSTOMER_ERROR_GUIDE.md`](docs/API_V1_CUSTOMER_ERROR_GUIDE.md)
- Integration checklist: [`docs/API_V1_INTEGRATION_CHECKLIST.md`](docs/API_V1_INTEGRATION_CHECKLIST.md)
- TypeScript SDK: [`packages/cyber-sentinels-sdk/README.md`](packages/cyber-sentinels-sdk/README.md)

The TypeScript SDK is repository-local and unpublished. Do not run `npm install @cyber-sentinels/sdk` from a public registry. The supported repository example consumes it through a local `file:` dependency.

The V1 API is a trust-decision and evidence-preservation boundary. It does not replace IAM, KYC, a firewall, a human review system, or downstream execution controls. `VERIFIED` is not `AUTHORIZED`; `REVIEW` is not `ALLOW`; and no response is never an approval.

## Local development

Node 22 and npm 10 are required.

```bash
npm install
cp .env.example .env.local
npm run dev
```

See [`docs/BUILD_AND_QUALITY_COMMANDS.md`](docs/BUILD_AND_QUALITY_COMMANDS.md) before running release or environment-sensitive commands. Do not apply migrations or deploy from the customer quickstart.
