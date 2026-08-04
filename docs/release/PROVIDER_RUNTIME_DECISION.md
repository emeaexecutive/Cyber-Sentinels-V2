# Provider and runtime decision

## Decision summary

The repository should continue using the current provider abstractions and runtime boundaries, but the public story should avoid presenting them as fully production-proven in all environments.

## Selected approach

- Preserve the provider abstraction and adapter pattern already present in the repository.
- Keep the runtime decisions bounded to the current staging-safe implementation.
- Avoid presenting specific provider integrations as fully operational until live staging evidence is available.

## Evidence posture

- Repository evidence exists for provider abstraction and adapter scaffolding.
- Live staging proof remains pending.
- Public claims should reference staged integration and diligence, not guaranteed live capability.
