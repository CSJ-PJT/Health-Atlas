# Supabase Project Setup

Current project ref:

- `ahdslmqkntopkokbceap`

Current client config:

- `VITE_SUPABASE_URL=https://ahdslmqkntopkokbceap.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_m166iZKz03bLYsft8Xgwrw_C28PpR6A`

## Required local setup

1. Login to Supabase CLI

```powershell
supabase login
```

Or set an access token:

```powershell
$env:SUPABASE_ACCESS_TOKEN="<your-access-token>"
```

2. Link this repo to the project

```powershell
npx supabase link --project-ref ahdslmqkntopkokbceap
```

3. Push local migrations to the new project

```powershell
npx supabase db push
```

4. If Edge Functions are used, deploy them after secrets are configured

```powershell
npx supabase functions deploy send-health-data --no-verify-jwt
```

## Important notes

- This repo already includes local migrations under [`supabase/migrations`](./supabase/migrations).
- A new migration for app state snapshots was added:
  - [`supabase/migrations/20260403090000_add_app_state_snapshots.sql`](./supabase/migrations/20260403090000_add_app_state_snapshots.sql)
- Until `db push` is completed on the new project, the app may fall back to local storage for social/feed/profile snapshot data and some Supabase-backed screens may not be fully available.

## Minimum tables expected by the app

- `profiles`
- `health_data`
- `transfer_logs`
- `openai_credentials`
- `app_state_snapshots`

## Current blocker

- `npx supabase link --project-ref ahdslmqkntopkokbceap` fails without `SUPABASE_ACCESS_TOKEN`
