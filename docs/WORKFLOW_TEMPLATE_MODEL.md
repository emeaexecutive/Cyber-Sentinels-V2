# Workflow Template Model

Cyber Sentinels is not a hiring platform. Hiring is one configuration of the Enterprise Trust Fabric.

Initial templates are defined in `lib/workflows/workflow-templates.ts`:

| Template | Accountable boundary |
| --- | --- |
| Hiring | People security and governed human review |
| AI Agent Operations | External agent authority and runtime governance |
| Privileged Access | Scoped, expiring and replayable privilege |
| Financial Approval | Bounded financial authority and approval evidence |
| Vendor Access | Third-party ownership, provider evidence and access review |
| Healthcare | Accountable clinical/regulated workflow governance |
| Insurance | Evidence and human governance for insurance workflows |
| Critical Infrastructure | Fail-closed authority and high-assurance evidence |

Each template supplies a stable ID, label, lifecycle mapping, accountable owner, declared purpose, minimum evidence, review requirement and boundary. Every template inherits the same Identity, Authority, Trust Engine, Runtime, Policy, Decision Intelligence, Enforcement, Replay, Evidence Graph, Trust Memory™, Validation, Provider Orchestrator and Governance services.

Templates may narrow policy, evidence and review requirements. They cannot replace core services, broaden delegated authority, create a separate trust score or create a provider-specific platform silo.
