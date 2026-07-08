# Health Web Integration Notes

`apps/health-web` is intentionally isolated from the existing heavy health app.

Reference-only areas:

- `apps/health-app/src/providers/samsung`
  - Health Connect type and mapping ideas for a later Android data import path.
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`
  - Existing health persistence concepts.
- `apps/health-app/src/integrations/supabase`
  - Existing Supabase schema/type reference.
- `supabase/migrations`
  - Database migration history and RLS reference.

Current exclusions:

- No direct import from `apps/health-app`.
- No Android or Capacitor runtime.
- No direct Health Connect browser integration.
- Supabase client initialization is isolated in `src/services/supabaseHealthRepository.ts`.
- The browser client uses only `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Failed Supabase reads fall back to sample preview state instead of crashing the app.
- No game, Unity, Fifth Dawn, or DeepStake code in the build graph.

Future public environment variables:

```env
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Server-only keys must stay outside this client app.
