# Supabase 프로젝트 설정

현재 RH 헬스케어 프로젝트 ref:

- `wazxzogbnmgqdrnussvc`

현재 클라이언트 설정:

- `VITE_SUPABASE_URL=https://wazxzogbnmgqdrnussvc.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_kxG6ju6yg6ECsaiYeuoaRg_G4MzLqm3`

## 로컬 설정 절차

1. Supabase CLI에 로그인합니다.

```powershell
supabase login
```

또는 access token을 환경 변수로 설정합니다.

```powershell
$env:SUPABASE_ACCESS_TOKEN="<your-access-token>"
```

2. 이 저장소를 RH 헬스케어 프로젝트에 연결합니다.

```powershell
npx supabase link --project-ref wazxzogbnmgqdrnussvc
```

3. 로컬 마이그레이션을 새 프로젝트 DB에 적용합니다.

```powershell
npx supabase db push
```

4. Edge Function을 사용하는 경우 secrets를 설정한 뒤 배포합니다.

```powershell
npx supabase functions deploy send-health-data --no-verify-jwt
```

## 중요 메모

- 이 저장소에는 [`supabase/migrations`](./supabase/migrations) 아래에 로컬 마이그레이션이 포함되어 있습니다.
- 앱 상태 스냅샷용 마이그레이션도 포함되어 있습니다.
  - [`supabase/migrations/20260403090000_add_app_state_snapshots.sql`](./supabase/migrations/20260403090000_add_app_state_snapshots.sql)
- 새 프로젝트에서 `db push`가 완료되기 전에는 소셜, 피드, 프로필 스냅샷 데이터가 로컬 저장소로 대체될 수 있고 일부 Supabase 기반 화면이 완전히 동작하지 않을 수 있습니다.

## 앱이 기대하는 최소 테이블

- `profiles`
- `health_data`
- `transfer_logs`
- `openai_credentials`
- `app_state_snapshots`

## 현재 상태

- 새 RH 헬스케어 프로젝트는 연결되어 있습니다.
- 마이그레이션은 새 프로젝트에 적용되어 있습니다.
- `send-health-data` Edge Function은 새 프로젝트에 배포되어 있습니다.
