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
- Failed Supabase reads show a safe empty/error state instead of crashing the app.
- No game, Unity, private-product, or private-product code in the build graph.

Production provider policy:`r`n`r`n- Supported provider: Samsung Health via Android Health Connect.`r`n- Health Connect is the transport layer only; all production reads must use the verified Samsung Health DataOrigin.`r`n- Other health providers and mock/sample fallback are disabled in production runtime.`r`n`r`nDashboard data source states:

- `sample`: sample data based preview.
- `supabase`: Supabase `health_data` read succeeded with a publishable key.
- `signed_out`: Supabase is configured and the current user must log in.
- `error`: Supabase is configured but the read failed, so the UI falls back to sample data.

ArchiveOS status handoff:

- Keep `public/health-status.json` available under `/health/health-status.json`.
- ArchiveOS can read `statusModel`, `lastKnownMode`, and `archiveOs` to distinguish sample, Supabase, unconfigured, and error states.
- Health Web must remain read-only and must not expose service role keys.

Future public environment variables:

```env
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Server-only keys must stay outside this client app.
