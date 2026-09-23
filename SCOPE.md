# Delivery Scope

## Time box

The project has roughly one evening plus one full day (about 8–12 focused hours). The goal is a complete, demonstrable vertical slice rather than broad polish.

### Tonight — foundation and playable loop (about 4–5 hours)

- Finish project setup, supplied assets and a deployable build.
- Implement the PixiJS lifecycle, arena, player movement and one blocking island.
- Add Chaser and Shooter behavior, all weapon inputs, damage, score, HUD and match endings.
- Add pause/resume and restart before stopping for visual polish.

### Tomorrow — product flow and delivery (about 5–7 hours)

- Complete Menu, Options, Result, Ranking and Match History screens.
- Add local persistence, Axios/TanStack Query/MSW integration and idempotent match saving.
- Add usable landscape touch controls and responsive layout.
- Cover a small set of critical Playwright journeys, fix console errors, document and deploy.

The estimate assumes the supplied assets are usable without re-authoring and deployment credentials are already available. If the core game is not stable by the end of tonight, API failure scenarios and visual refinements are cut before gameplay requirements.

## P0 — must ship

1. **Foundation and navigation**
   - React screens: Menu, Options, Game, Result, Ranking, and Match History.
   - Strict TypeScript, responsive layout, keyboard focus, semantic status values.
   - Persisted and validated session/spawn options.
2. **Complete game loop**
   - PixiJS arena, player, island, Chaser, Shooter, projectiles, health bars, HUD.
   - Delta-time simulation, arena/island collisions, both weapon types, cooldowns and scoring.
   - Timeout/death endings, pause/focus handling, clean restart and teardown.
   - Keyboard plus landscape touch controls.
3. **Data flow**
   - Typed Axios API, TanStack Query hooks, MSW handlers and fixtures.
   - Paginated ranking/history and idempotent match registration.
   - Local persistence of confirmed data and pending submissions.
4. **Confidence and delivery**
   - E2E happy paths for options, gameplay, pause, result and API registration.
   - Production build, deployed URL, setup and architecture documentation.

## P1 — only after the deployed P0 build is stable

- One simple deterministic API error scenario.
- A small number of visual baselines if time permits.
- Simple muzzle flash, hit flash, explosion particles and health-based ship tint.
- Basic sound effects with mute control.
- A brief manual performance and teardown note.

## P2 — explicit stretch goals

- Animated screen transitions and animated menu background.
- Richer HUD frames and more elaborate responsive menus.
- Music, layered ambience, volume mixing and additional sound variations.
- Advanced water effects, camera shake and richer particles.
- Additional enemies, power-ups, maps or progression.
- Full failure-scenario matrix, exhaustive E2E coverage and detailed profiling evidence.

## Definition of done for the MVP

- A player can open the deployed URL, read the controls, configure a match, play with both enemy types and all three firing commands, pause/resume, reach either ending, and restart.
- Completed matches appear once in Ranking and Match History; API failure never blocks gameplay.
- Desktop and landscape-mobile Chromium flows work without uncaught console errors.
- `npm run lint`, `npm run typecheck`, `npm run build`, and the P0 Playwright suite pass from a clean checkout.
