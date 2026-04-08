# AGENTS

## Monorepo Rules

- `apps/health-app` and `apps/private-product-game` must stay independently buildable.
- Shared contracts go in `packages/*`.
- Do not make the game app import or query raw health records directly.
- Health-to-game data must flow through derived, game-safe linkage only.
- Treat the repository root `src/` tree as transitional legacy code after the split. Prefer editing the app-specific trees first.

## Health App

- Preserve provider sync, analytics, AI coach, social, admin, and settings behavior.
- Keep the game surface lightweight:
  - link account
  - preview derived parameters
  - show linked missions/rewards
- Do not embed the full standalone game here.

## Game App

- Keep gameplay systems isolated from the React shell where practical.
- Prefer serializable state and adapter/repository boundaries.
- Design with future desktop/EXE/Steam packaging in mind.
- Do not make progression depend on health linkage.

## Supabase / Security

- Use migrations only.
- Keep RLS enabled on client-facing tables.
- Prefer RPCs for sensitive linkage flows.
- Avoid broad public table access unless there is a documented temporary reason.

## Entertainment

- Preserve existing arcade, strategy, and sandbox functionality.
- New major modes must be isolated modules, not hacks inside old reducers.
