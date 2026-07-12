# Enterprise Navigation

Release: 1.0 Alpha

## Navigation hierarchy

1. The global header identifies Cyber Sentinels and exposes Enterprise Workspace, Notifications, protected Administration where authorized, and Logout.
2. The authenticated sidebar owns the seven workspace areas.
3. The global trust context bar owns record context; pages must not add a second global context bar.
4. The persistent status strip links health categories to their existing operational homes.
5. Local page navigation may organize the current workflow only.

## Command palette

- Open with `Ctrl+K` or `Cmd+K`.
- Search by capability, entity type, operational task or investigation intent.
- Use arrow keys to select, Enter to open and Escape to close.
- Admin-only destinations are omitted unless the verified admin shell is active.
- Quick actions navigate to existing guarded workflows; the palette does not submit decisions or mutate records.

## Mobile behavior

The sidebar becomes a horizontally scrollable area selector. Global context becomes a two-column grid and then expands at larger breakpoints. Status remains a compact horizontal strip. The command palette uses a bounded viewport with its own scroll area.

## Ownership rule

Authenticated navigation is operational. Public Platform, Solutions, Trust, Enterprise, Developers, Pricing and Resources navigation remains separate and is not reproduced inside the workspace.
