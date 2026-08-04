# Technical truth public claims audit

## Scope

This audit reviews public-facing claims in the repository and classifies them against repository evidence and live-staging evidence available in this workspace.

| Claim | Route/file | Repository evidence | Live evidence | Classification | Required correction |
| --- | --- | --- | --- | --- | --- |
| Enterprise Trust Infrastructure continuously verifies identity, authority, environment, evidence and operational scope | app/page.tsx | Repository contains trust-event, replay, evidence graph, policy, authority and continuous-trust foundations | Not proven from live staging in this workspace | Implemented but not live-proven | Reframe as building and validating the capability in a controlled design-partner release |
| Trust infrastructure can enforce high-risk agent actions | app/page.tsx, app/platform/page.tsx | Repository contains decision, enforcement and replay foundations; runtime integration is not yet fully proven | Not proven from live staging in this workspace | Prototype / partially integrated | Reframe as a planned design-partner proof path rather than a production claim |
| Provider orchestration is production-ready | app/platform/page.tsx | Provider abstraction and Hopae adapter exist; live provider health is not externally proven in this workspace | Not proven | Partially integrated | State as partial and staged integration rather than production-ready |
| Cryptographic immutability is offered end to end | docs and public copy | Repository includes append-only evidence concepts and replay continuity but not a fully proven immutable evidence envelope | Not proven | Future / unsupported | Remove or reframe as an objective for the next build phase |
| Deepfake detection or proprietary behavioural ML is available | docs and public variants | Repository has detection and validation scaffolding but not validated proprietary ML | Not proven | Prototype / simulation | Remove unsupported attribution and describe as future work |
| Continuous monitoring of every system is in place | public-facing copy and docs | Repository contains event and trust lifecycle foundations; broad live monitoring is not evidenced here | Not proven | Partial integration | Reframe as selected integration and staged evidence collection |
