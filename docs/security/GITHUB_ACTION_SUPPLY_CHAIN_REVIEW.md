# GitHub Actions supply-chain review

## Action inventory

| Action | Immutable commit | Provenance/version | Workflows | Decision |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `11d5960a326750d5838078e36cf38b85af677262` | Official Actions publisher; current `v4` tag resolution at review | Production verification, CodeQL, Gitleaks | Pin and disable persisted credentials |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | Official Actions publisher; current `v4` tag resolution at review | Production verification | Pin; Node input remains `22` |
| `gitleaks/gitleaks-action` | `ff98106e4c7b2bc287b24eaf42907196329070c7` | Upstream `v2.3.9` tag target | Redacted secret scan | Retain merged immutable pin |
| `github/codeql-action` | `dfbc6164313353db46c80e2fcfd38820bd2c3c46` | Official GitHub publisher; `v3.37.4` tag resolution at review | CodeQL init, autobuild and analyze | Replace mutable version tag with commit pin |

Tag resolution was verified directly against each publisher repository. Human-readable version comments are retained beside every SHA so Dependabot can continue proposing reviewable updates.

## Workflow controls

- Triggers are `pull_request` and pushes to `main`; no `pull_request_target` exists.
- Production verification and secret scanning have only `contents: read`.
- CodeQL has `actions: read`, `contents: read` and the required `security-events: write` for SARIF upload.
- CodeQL scope remains `javascript-typescript`, with init, autobuild and analyze stages intact.
- Gitleaks checks full history (`fetch-depth: 0`), runs on PR and main pushes, and retains failing-exit behavior.
- Checkout credentials are not persisted. No workflow executes downloaded artifacts or interpolates untrusted PR text into shell commands.
- No workflow echoes secret values. The Gitleaks token is passed through the action environment and secret findings are independently verified with redacted local scans.

## Findings

The starting Production verification and CodeQL workflows used floating or mutable tags. Epic 35 pins them without changing permissions, triggers, language scope, SARIF behavior or verification coverage. No broad write permission, untrusted artifact execution, scanner disablement or scope reduction was found.
