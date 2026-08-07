# Health Atlas Recovery State

## 현재 작업 복구
- 현재 Branch: `fix/health-atlas-live-sync`
- Base Main: `origin/main` (`ddf22f7`)
- 현재 HEAD: `4d7f4e165497242472565fcc86f6a4cf85f2da52`
- Remote Feature: `origin/fix/health-atlas-live-sync` (동일)

## 마지막 완료 Gate
- Gate 0: Git / Branch / remote 상태 재확인 완료
- Gate 1: 로컬 변경점 분류 및 운영 기준선 조회 완료
- Gate 2: Health 계약 정합성 패치 적용 준비 완료(요청 반영 상태 반영 필요)

## 현재 운영 상태
- `https://161.33.17.84/health/` 접근: HTTP 200
- `health-status.json`: `status=waiting_backend`, `publicDashboard=true`, `liveData=false`, message=백엔드 복구 진행 중
- 현재 배포 자산: `index.html`은 `/health/assets/index-*.js`, `/health/assets/index-*.css` 참조
- 미리보기(maintenace): `/health/maintenance/index.html` 존재

## Supabase 상태
- `supabase/config.toml` project_id: `wazxzogbnmgqdrnussvc`
- `supabase status`(로컬): Supabase 컨테이너 미기동/미연결로 인해 조회 실패 (`No such container`)
- `npx supabase migration list --linked`: 미연결 오류 (`Cannot find project ref`)
- CLI 연동 상태: 미리 확인 필요

## Migration 상태
- 최신 커밋 변경 대상:
  - `supabase/migrations/20260806170000_restore_health_dashboard_and_ingest.sql`(기존)
  - `supabase/migrations/20260807093000_align_health_contracts.sql`(신규) 추가
- 핵심 변경: `health_ingest_daily`에서 `p_user_id` 제거, `auth.uid()` 기반 소유권 적용

## Android 상태
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`:
  - 저장 payload 기본값 0 제거 및 `null` 허용 정리
  - `saveHealthSnapshot`에서 인증 세션 체크 추가
- 실기기 E2E: 미실행

## Web 상태
- `apps/health-web/public/health-status.json`를 백엔드 준비 전 상태값으로 전환
- 로그인 패널 문구/가이드 메시지 정리
- no-data에서 동기화 시각 표시 `없음`으로 처리(요약 동기화시각 기본값 정리)
- 에러 메시지 사용자 노출: 로그인 실패시 가이드 메시지 사용

## Edge Function 상태
- `supabase/functions/send-health-data/index.ts`:
  - `health_ingest_daily` 호출에서 `p_user_id` 제거
  - `verify_jwt=true`는 `supabase/config.toml`에서 유지
- 배포/검증: 미배포(로컬 수정만 반영)

## Git 상태
- Dirty files:
  - `apps/health-web/public/health-status.json`
  - `apps/health-web/src/App.tsx`
  - `apps/health-web/src/services/env.ts`
  - `apps/health-web/src/services/healthDataSource.ts`
  - `apps/health-web/src/services/supabaseHealthRepository.ts`
  - `apps/health-web/src/services/syncStatus.ts`
  - `apps/health-web/src/types.ts`
  - `apps/health-app/src/providers/shared/services/healthDataRepository.ts`
  - `supabase/functions/send-health-data/index.ts`
  - `supabase/migrations/20260807093000_align_health_contracts.sql`
  - `docs/health-atlas-recovery-state.md`(신규)
  - `app` 유지 중인 미커밋 문서/디렉터리:
    - `apps/health-web/public/maintenance/`
    - `apps/health-web/src/services/healthSamplePreview.ts`
    - `docs/health-atlas-restore-runbook.md`

## 남은 blocker
- Supabase 프로젝트 원격 ACTIVE 상태 및 실 데이터 검증 미완료
- Android 실기기 E2E 미완료
- OCI SSH 상태 미완료(운영 배포 미실행)
