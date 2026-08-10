# Health Atlas Recovery State

## Current Git
- BRANCH: `fix/health-atlas-live-sync`
- LOCAL_HEAD: `82eec14b93ab2a57eaa2da9f9e86fe4c1f1219aa` before current checkpoint commit
- REMOTE_HEAD: `origin/fix/health-atlas-live-sync` = `4d7f4e165497242472565fcc86f6a4cf85f2da52`
- ORIGIN_MAIN: `ddf22f7a93db57fdba618e31695b4ee9541f4c6e`
- LOCAL_AHEAD: `8` before current checkpoint commit
- WORKTREE: Health Web, Edge Function, Supabase migrations, tests, and recovery docs modified; artifacts remain untracked and must not be committed.

## Supabase
- SUPABASE_CAPACITY_BLOCKER: `RESOLVED`
- HEALTH_PROJECT_RESTORE: `STARTED_EXTERNALLY`
- HEALTH_PROJECT_LAST_STATUS: `COMING_UP`
- HEALTH_PROJECT_CURRENT_STATUS: `ACTIVE_DB_REACHABLE`
- PROJECT_REF: `wazxzogbnmgqdrnussvc`
- PROJECT_NAME: `RH Healthcare`
- TARGET_MATCH: `supabase/config.toml`, local `.env`, and deployed DB target all point to the Health project ref.
- ARCHIVE_PROJECT_TOUCHED: `NO`

## Database
- `public.health_data`: exists.
- RLS: enabled.
- Row count: `0`.
- `user_id IS NULL`: `0`.
- `user_id IS NOT NULL`: `0`.
- Distinct users: `0`.
- Latest synced_at: `NULL`.
- Legacy unowned rows: none observed.

## Migrations
- Applied remote migration: `align_health_contracts` (`20260810075252`)
- Applied remote migration: `harden_health_data_role_grants` (`20260810075331`)
- Local tracked migration updated: `supabase/migrations/20260807093000_align_health_contracts.sql`
- Local new migration: `supabase/migrations/20260810075319_harden_health_data_role_grants.sql`
- `health_get_dashboard(p_limit integer)`: exists, no `p_user_id`, `auth.uid()` required, limit clamped 1-90, no raw JSONB return.
- `health_ingest_daily(...)`: exists, no `p_user_id`, `auth.uid()` ownership, timestamp and payload size validation.

## RLS / IDOR
- Anon REST direct access: `401`
- No JWT Edge Function: `401`
- Invalid JWT Edge Function: `401`
- `authenticated`: `SELECT` only on `public.health_data`
- `anon`: no table privileges on `public.health_data`
- Direct browser write: blocked by table grants/RLS.
- Cross-user ownership parameter: absent from dashboard and ingest RPC signatures.

## Edge Function
- Function: `send-health-data`
- Remote version: `2`
- Status: `ACTIVE`
- Remote `verify_jwt`: `true`
- Source updated to validate JWT with admin client, then call `health_ingest_daily` with the user's bearer token context.
- Raw health payload logging: not present.

## Android
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`
- Session required before upload.
- `send-health-data` function invoke path used.
- Client payload does not set `user_id`.
- Physical device E2E: `PENDING`

## Web
- Raw `health_data` read not used in Health Web.
- Dashboard reads `health_get_dashboard`.
- No-data sync timestamp fallback removed.
- Production sample preview remains dev-only.
- Root `.env` contains Health project production target; not committed.
- Production build generated with process env from root `.env`.

## Tests
- `npm.cmd run test`: PASS
- `npm.cmd run test:health-web`: PASS
- `npm.cmd run test:health-auth`: PASS
- `npm.cmd run test:health-contract`: PASS
- `npm.cmd run test:health-rls`: PASS
- `npm.cmd run typecheck:health`: PASS
- `npm.cmd run typecheck:health-web`: PASS
- `npm.cmd run build:health-web`: PASS
- `npm.cmd run lint:health`: FAIL due existing unrelated Health App lint debt.
- Health Web scoped ESLint: PASS.

## Production Build
- `apps/health-web/dist`: built.
- Target ref present in JS bundle: `true`
- Source maps: `0`
- Service-role key in bundle: `0`
- SSH private key in bundle: `0`

## OCI
- Host: `161.33.17.84`
- User: `opc`
- SSH key source: Task/Gmail official path `C:\Users\dan18\Downloads\OCI_SSH.key`
- TCP 22: open.
- SSH status: server closes after `SSH2_MSG_KEXINIT sent`, before user auth.
- OCI CLI: not installed.
- OCI Python SDK: not available in current Python stub.
- OCI deploy: pending SSH/control-plane recovery.

## Operating
- `/health/`: HTTP `200`
- `/health/health-status.json`: `status=maintenance`, `publicDashboard=false`, `sampleDataEnabled=false`
- Current production JS target: not Health project; deployment pending.
- Atlas regression: not yet rerun after deploy because deploy pending.

## Next Command
```powershell
Set-Location "C:\Users\dan18\OneDrive\문서\Archive\Health-Atlas"
$git="C:\Users\dan18\AppData\Local\ArchiveTools\MinGit\v2.55.0.windows.3\cmd\git.exe"
& $git status --short
npm.cmd run test:health-web
npm.cmd run test:health-auth
npm.cmd run test:health-contract
npm.cmd run test:health-rls
npm.cmd run build:health-web
ssh -vvv -i "C:\Users\dan18\Downloads\OCI_SSH.key" -o IdentitiesOnly=yes -o ConnectTimeout=15 -o ConnectionAttempts=1 opc@161.33.17.84 "hostname && id"
```
