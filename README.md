# Pirate Battle

A browser-based, top-down naval shooter built for the React & PixiJS challenge.

## Requirements

- Node.js 22+
- npm 10+

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The local API is mocked in the browser by MSW. Set `VITE_ENABLE_MOCKS=false` only when connecting to a real API.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm run test:e2e
```

Install the Playwright browser once before the first E2E run:

```bash
# Ubuntu/WSL system libraries (requires your sudo password)
sudo npx playwright install-deps chromium

# Browser binary
npx playwright install chromium
```

## Delivery strategy

The implementation order and explicit scope cuts are documented in [SCOPE.md](SCOPE.md). Architectural boundaries are documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Current controls (planned for the MVP)

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move forward | `W` / `Arrow Up` | Hold forward control |
| Rotate | `A` / `D` or arrows | Hold left/right control |
| Front cannon | `Space` | Front-fire button |
| Left broadside | `Q` | Left-fire button |
| Right broadside | `E` | Right-fire button |
| Pause | `Escape` / `P` | Pause button |
