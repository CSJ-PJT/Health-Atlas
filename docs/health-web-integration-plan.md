# Health Web Integration Plan

## Roles

Android app:

- Requests Health Connect permissions.
- Reads steps, activity, sleep, weight, and heart-rate data on device.
- Normalizes provider payloads before sync.
- Sends records to Supabase through authenticated flows or a server-side sync path.

Health Web:

- Runs as the lightweight `/health/` web dashboard.
- Reads derived dashboard data from Supabase in read-only mode.
- Falls back to sample preview data when env is missing, RLS denies access, or the query fails.
- Does not import the full `apps/health-app` or Android runtime.

Supabase:

- Stores user-scoped health records.
- Keeps RLS enabled on client-facing tables.
- Exposes only publishable-key read paths to the browser.
- Keeps service role usage on trusted backend/sync code only.

## Existing Table Candidates

- `public.health_data`
  - Candidate source for Web dashboard reads.
  - Existing fields include `synced_at`, `steps_data`, `exercise_data`, `sleep_data`, `body_composition_data`, and `nutrition_data`.
  - Later migration added `user_id` and RLS policies for user isolation.

- `public.game_link_profiles`
  - Derived game-safe profile data only.
  - Useful reference for derived summaries, but not a source for raw health dashboard records.

## Proposed Sync Flow

1. Android reads Health Connect data after the user grants permissions.
2. Android maps raw provider records into normalized daily records.
3. Authenticated sync writes to `health_data` with the user's `user_id`.
4. Health Web initializes a Supabase client with public env values.
5. Health Web reads recent `health_data` rows for the current user.
6. Health Web computes 7-day and 30-day dashboard summaries client-side until a dedicated summary RPC exists.

## Failure States

- Permission denied: Android reports missing permission and does not sync.
- No data: Web shows an empty or sample preview state with a clear next step.
- RLS denied: Web stays available and shows sample preview plus Sync Error.
- Network failure: Web keeps the dashboard shell visible and reports connection failure.
- Schema mismatch: Repository layer catches the read failure and avoids crashing the app.

## Privacy Notes

- Do not print access tokens, publishable key values, service role keys, or raw health payloads in logs.
- Keep `.env` and `.env.local` out of commits.
- Keep service role keys out of client bundles.
- Prefer narrow read queries and derived summaries where possible.
- Preserve RLS for `health_data` and any future summary table.

## Next Implementation Steps

1. Confirm authenticated Web session strategy for `/health/`.
2. Decide whether Health Web reads `health_data` directly or through a read-only RPC.
3. Add a migration for a derived `health_daily_summaries` table only after the model is stable.
4. Add Android sync status reporting for last successful sync, permission state, and upload failures.
5. Add ArchiveOS polling against `public/health-status.json` or a future service health endpoint.
