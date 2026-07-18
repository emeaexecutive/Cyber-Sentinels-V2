# Hooks

## Current state

No root `hooks/` directory and no custom `useX` hook declaration were found. This is an implementation gap, not an empty layer to populate speculatively.

React and Next navigation hooks are consumed directly by:

- authentication and verification pages;
- demo lab and evidence-upload form modules;
- navigation, command palette and Trust OS shell components;
- interactive demo and walkthrough components;
- receipt, issue, waitlist and refresh controls; and
- the root error boundary.

## Shared logic

Shared non-React behavior currently lives in `lib/`. Component-local state, effects, router interaction and browser-event behavior remain in the consuming Client Components.

## Dependencies and consumers

There is no hook dependency graph because no shared hooks exist. Direct consumers import React hooks from `react` and navigation hooks from `next/navigation`.

## Potential duplication

The following patterns warrant review before creating any shared hook:

- form submission, pending and error state across login, waitlist, receipt and issue forms;
- router refresh/navigation behavior across Trust OS and verification actions;
- client-side session/bootstrap handling in login and verification pages; and
- mounted/keyboard/event-listener behavior in navigation and command-palette modules.

Duplication has not been proven solely by similar imports. A future extraction requires at least two behaviorally equivalent consumers, a stable typed contract and tests. Do not create `hooks/` merely to match a target directory diagram.
