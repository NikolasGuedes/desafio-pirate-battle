# Architecture

## Boundaries

- `src/ui`: React screens, accessible controls, navigation state and low-frequency HUD snapshots.
- `src/game`: `PirateGame` owns the PixiJS application, arena rendering, input, simulation, AI, combat and teardown. Configuration and arena templates remain separate in `config.ts` and `scenarios.ts`.
- `src/audio`: Web Audio sound manager for UI feedback, ambience, combat sounds, loops and master volume.
- `src/api`: typed contracts, Axios transport and local match persistence/outbox.
- `src/mocks`: MSW browser worker with local fixtures and browser-persisted mock matches.
- `tests/e2e`: Playwright journeys against the production build in desktop and landscape-mobile Chromium.

React does not render every animation frame. PixiJS owns the ticker, display objects, asset cache and continuous combat state for the lifetime of one game screen. The runtime publishes throttled HUD snapshots and terminal results to React, then releases its listeners, ticker and application through an idempotent destroy path that is safe under React Strict Mode.

## Simulation

Each ticker update uses a clamped delta time. Input is sampled first, followed by player movement, enemy AI, weapons, projectiles, collisions, damage, spawning, effects and cleanup. A pause gate stops simulation time and clears held input before resumption. Visible bounds are recalculated for landscape mobile viewports so ships remain inside the playable area.

Every match receives an immutable `GameConfig` snapshot. Balance and option changes therefore affect new matches without changing the simulation systems during an active match.

## State and persistence

React owns low-frequency screen and settings state; PixiJS owns high-frequency gameplay state. Settings, the latest result and pending match submissions are stored in `localStorage`. In the default deployment, MSW handles ranking/history requests and persists mock records locally in the browser.

Axios owns HTTP transport, while TanStack Query owns server-state caching, retries, pagination and invalidation. Match IDs are generated at the terminal game event and sent as idempotency keys, so a pending submission can be retried without duplicating a result.

The app can switch from MSW to a compatible API with `VITE_ENABLE_MOCKS=false` and `VITE_API_BASE_URL`.
