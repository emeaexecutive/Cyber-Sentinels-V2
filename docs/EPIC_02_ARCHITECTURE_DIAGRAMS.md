# Epic 02 Architecture Diagrams

Last updated: 2026-07-08

## Platform

```mermaid
flowchart TD
  Public[Public Platform] --> Enterprise[Enterprise Workspace]
  Enterprise --> Trust[Trust Engine]
  Enterprise --> Runtime[Runtime Engine]
  Enterprise --> Replay[Replay Engine]
  Enterprise --> Governance[Governance Engine]
  Enterprise --> Validation[Validation Engine]
  Admin[Admin Operations] --> Providers[Provider Layer]
  Providers --> Trust
  Validation --> Reports[Readiness and Investor Evidence]
```

## Trust Flow

```mermaid
flowchart LR
  Actor[Human / AI Agent / Machine Identity] --> Authority[Authority and Purpose]
  Authority --> Evidence[Evidence]
  Evidence --> Trust[Trust Engine]
  Trust --> Decision[Allow / Review / Block]
  Decision --> Replay[Replay Timeline]
  Decision --> Governance[Governance Decision]
```

## Entity Graph

```mermaid
graph TD
  Human[Human Owner] --> Agent[AI Agent]
  Human --> Workflow[Workflow]
  Machine[Machine Identity] --> Workflow
  Agent --> Action[Runtime Action]
  Action --> Evidence[Evidence]
  Evidence --> Receipt[Receipt]
  Workflow --> Governance[Governance Review]
  Governance --> Outcome[Reviewed Outcome]
```

## Replay Flow

```mermaid
sequenceDiagram
  participant Actor
  participant Trust as Trust Engine
  participant Runtime as Runtime Engine
  participant Replay as Replay Engine
  participant Gov as Governance Engine
  Actor->>Runtime: action observed
  Runtime->>Trust: runtime and evidence context
  Trust->>Replay: trust transition recorded
  Replay->>Gov: replay-linked escalation context
  Gov->>Replay: reviewed outcome and rationale
```

## Governance Flow

```mermaid
flowchart TD
  Trigger[Trust change or anomaly] --> Queue[Governance Queue]
  Queue --> Reviewer[Named Reviewer]
  Reviewer --> Decision{Decision}
  Decision -->|Allow| Receipt[Receipt]
  Decision -->|Review| Evidence[Request Evidence]
  Decision -->|Block| Restriction[Restrict Workflow]
  Evidence --> Replay[Replay Updated]
  Receipt --> Replay
  Restriction --> Replay
```

## Provider Layer

```mermaid
flowchart LR
  Provider[External Provider] --> Adapter[Provider Adapter]
  Adapter --> State[Connected / Configured / Awaiting Credentials / Offline / Unsupported]
  Adapter --> Normalized[Normalized Evidence]
  Normalized --> Trust[Trust Engine]
  Normalized --> Replay[Replay Engine]
  Normalized --> Receipt[Receipt]
  State --> Admin[Provider Status]
```
