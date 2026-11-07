# AGENTS — Health Atlas

## Scope

- This repository contains RH Healthcare, its web dashboard, shared healthcare contracts, and existing migration history.
- Keep health data providers, Health Connect, AI analysis, admin, and settings functional.
- Game-specific Unity projects and independent game prototypes are maintained in a separate private repository, not here.
- Preserve the existing health-linked derived-data boundary for compatibility; never pass raw health tables into external games.

## Architecture and safety

- App-specific code stays under `apps/health-app` and `apps/health-web`.
- Shared contracts belong in `packages/*`.
- Root `src/` is transitional code; do not delete it just because a separate game was migrated.
- Database migrations are append-only; do not remove applied history casually.
- Keep RLS enabled, use RPC for sensitive linkage, do not commit client/server secrets or personal health data.
- Preserve existing health entertainment modes until separately scoped and tested.
