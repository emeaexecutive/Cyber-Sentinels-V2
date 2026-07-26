# Trust Graph repositories

Defines one persistence boundary for graph mutations and bounded reads. Implementations must scope every query by tenant, avoid per-row lookups, and commit each mutation with its immutable event atomically.
