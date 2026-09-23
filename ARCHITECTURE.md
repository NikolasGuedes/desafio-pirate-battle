# Architecture

## Boundaries

- `src/ui`: React screens, accessible controls, routing state and low-frequency HUD snapshots.
- `src/game`: framework-independent rules and configuration; the PixiJS runtime will own continuous combat state.
- `src/api`: transport-neutral contracts and the configured Axios client.
- `src/mocks`: MSW browser worker, handlers, fixtures and reproducible network scenarios.
- `tests/e2e`: Playwright user journeys against the production build.

React must not render on every animation frame. The game runtime publishes throttled HUD snapshots and terminal events to React. PixiJS owns its application, ticker, display objects, input subscription and asset cache for the lifetime of one game screen, and releases them through one idempotent destroy path so React Strict Mode remains safe.

## Simulation plan

The ticker supplies elapsed time to a fixed-step or clamped delta-time update. Input is sampled into an intent object, then movement, AI, weapons, projectiles, collisions, damage, spawning and cleanup run in a stable order. A pause gate stops simulation time entirely and clears held input before resumption.

Every match receives an immutable snapshot of `GameConfig`. Balance changes therefore affect data, not system logic, and option changes only affect later matches.

## Persistence and remote state

Local storage owns player options, mock records and a pending-submission outbox. Axios owns HTTP transport. TanStack Query owns server-state cache, retries and invalidation. Match IDs are generated once at the terminal game event and act as idempotency keys, allowing a timed-out submission to be retried without creating duplicates.

This document will be expanded with concrete lifecycle, collision, asset-loading and failure-recovery decisions as those systems land.
