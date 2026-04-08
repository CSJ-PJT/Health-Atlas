# Health Sync Daily Monorepo

This repository is now structured as a monorepo with two independently deployable apps:

- `apps/health-app`
- `apps/private-product-game`

The health app remains the source of truth for raw health data, provider sync, analytics, AI coaching, social, admin, and game-link derivation.

The standalone game app consumes only derived game-safe parameters through a dedicated linkage layer. It never reads raw health records directly.

## Workspace Layout

```text
apps/
  health-app/
  private-product-game/
packages/
  shared-auth/
  shared-profile/
  shared-types/
  game-link-sdk/
  design-system/
supabase/
  migrations/
docs/
  monorepo-architecture.md
  life-sim-mode.md
```

## Apps

### Health App

Focused on:

- provider sync and normalized health data
- AI coaching and analytics
- social and admin flows
- lightweight game-link management

Game-related UI in the health app is intentionally small:

- connect/disconnect game account
- preview derived game parameters
- view linked missions and rewards

### private-product Game

Focused on:

- standalone top-down life-sim RPG vertical slice
- fullscreen-capable play surface
- local-first save system with optional linked cloud save
- optional bonuses from derived game-link data only

## Commands

From the repo root:

```bash
npm run dev:health
npm run dev:game
npm run build:health
npm run build:game
npm test
```

## Environment

Copy `.env.example` to `.env` and provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Database

Apply migrations with:

```bash
npx supabase db push
```

Recent monorepo/game-link work introduces:

- secure-ish game account linkage tables
- derived game-link profile storage
- mission/reward sync tables
- optional standalone life-sim cloud saves

See:

- `docs/monorepo-architecture.md`
- `docs/life-sim-mode.md`

## Security Notes

- The game must not consume raw health rows.
- The linkage layer exposes only derived parameters such as activity, sleep, recovery, hydration, consistency, and resonance.
- New linkage tables use RLS and RPC-driven access.
- Current client identity is still based on the existing app profile/user model, so linkage RPC policies are a transitional compromise until first-class auth is fully tightened.
