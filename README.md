# PLAYGROUND

**Pick a game. Press play. Own the moment.**

PLAYGROUND is a keyboard-first, cinematic arcade console for the browser. Phase 1 ships a modular console engine, an original playable Phaser 4 game (**Neon Dodge**), and previews of **Taxi Rush** and **Kasi Fighters**. It is deliberately local-first: no login, backend, paid tickets, or fake controller pairing.

## Requirements
Node.js 22+ and npm 10+ (Node 20.19+ also works).

```bash
npm ci
npm run dev
# open http://localhost:5173
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | TypeScript checks and Vite production bundle |
| `npm run preview` | Preview built app |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright browser tests (run `npx playwright install chromium` first) |

`npm run build` generates static assets in `dist/`, suitable for Vercel (framework Vite; build `npm run build`, output `dist`). CI runs typecheck, lint, unit tests and build; browser E2E uses Playwright.

## Controls

| Screen | Keyboard |
| --- | --- |
| Library | ←/→ select within a row, ↑/↓ switch rows; Enter or Space opens details |
| Game details | Enter or Space plays; Escape goes back |
| Neon Dodge | ←/→ or A/D to move, Space activates a brief shield, P or Escape pauses |
| In-game | R restarts, F requests fullscreen, Escape/P toggles pause |
| General | F fullscreen (browser support required) |

All interactions have visible buttons for mouse/touch browsing. Neon Dodge is **keyboard-only gameplay** in Phase 1. On mobile, use a keyboard to play.

## Console architecture

- `src/engine/games`: typed registry and game module SDK. Registry feeds library, hero and details.
- `src/engine/input`: normalized `InputRouter` and `KeyboardAdapter`. Each event carries player ID, action, press/release and source; external adapters can be attached later.
- `src/engine/players`: local player assignment.
- `src/engine/sessions`: monotonic-clock free/demo sessions with pause-safe elapsed accounting.
- `src/engine/core`: explicit console state transitions and lifecycle store.
- `src/engine/display`: fullscreen and viewport behavior.
- `src/engine/games/GameHost.ts`: lifecycle coordinator; owns exactly one loaded game instance.
- `src/games/neon-dodge`: Phaser implementation and original synthesized SFX, loaded on demand.
- `src/console`: React library, details, settings, overlays; no game-specific physics.
- `src/engine/storage.ts`: versioned local preferences and achievements; not trusted commercial records.

## Add a game

1. Add `src/games/your-game/index.ts` exporting a `GameModule`. Implement `mount(context)` returning an object supporting `start/pause/resume/restart/destroy`. Emit `score`, `ready` and `ended` events via `context.emit`.
2. Register metadata in `src/engine/games/registry.ts`: a unique ID, genuine player count, supported input types, artwork key, `status: 'playable'`, and a dynamic `load: () => import('...')`.
3. Add original artwork to the visual artwork renderer. The console, session and input subsystems do not need game-specific conditionals.

Only register a playable game once an actual module exists.

## Phone controllers (Phase 2)

Introduce `PhoneControllerAdapter` implementing `InputAdapter`. The phone pairs to a console session via a short-lived, server-authorized code displayed as a QR link. A real-time channel (WebSocket/WebRTC) forwards sequenced press/release events with player ID and reconnect/timeout policies. The console's `InputRouter` and `PlayerManager` remain unchanged; add authentication, rate limits and focus/connection release safety at this boundary. **No pairing feature is implemented in Phase 1.**

## Commercial kiosks (future)

Build a trusted backend that issues short-lived signed entitlements, centrally enforces session expiration, stores payment audit records and supports device IDs, fleet health, remote provisioning and offline rules. The local demo timer, local scores and localStorage are **not** secure billing or proof of payment. Prototype low-end hardware by profiling browser memory, frame timings and GPU load on the actual device.

## Performance benchmark

Build and preview the production bundle. On the target computer, open DevTools Performance, record one minute of launcher navigation, 60 seconds of gameplay, then five start/exit cycles. Inspect long tasks, FPS, memory/heap snapshots, canvases and detached listeners. Compare a 1366×768 laptop with target projector hardware and repeat with reduced motion enabled. Avoid assuming a fixed FPS from a development machine.

Artwork, game rules, and simple Web Audio effects are original to this project.
