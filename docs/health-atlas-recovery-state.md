# Health Atlas Recovery State

## 현재 작업 복구
- CURRENT BRANCH: `fix/health-atlas-live-sync`
- BASE MAIN: `origin/main` (`ddf22f7`)
- LOCAL START HEAD: `4d7f4e165497242472565fcc86f6a4cf85f2da52`
- CURRENT HEAD: `7ae798f05d6c66dac2f704211306bbf5a41b6627`
- REMOTE HEAD: `origin/fix/health-atlas-live-sync` (`4d7f4e1`) (local ahead 3)

## 마지막 완료 Gate
- Gate 0: Git/브랜치/원격 기본 상태 점검 완료
- Gate 1: 운영 기준선 및 로컬 상태 재확인 완료
- Gate 2: 인증 계약 정합성 패치 반영 및 체크포인트 문서화 (`eb3cec8`)
- Gate 2.5: 현재 변경 파일 점검 및 회복 상태 동기화 완료

## 현재 운영 상태
- URL: `https://161.33.17.84/health/`
- HTTP: `200`
- `health-status.json`(운영): status=`maintenance`, publicDashboard=`false`, sampleDataEnabled=`false`
- 현재 `index`: `/health/assets/index-C8KzMeNX.js`, `/health/assets/index-phMhBGPF.css`
- Console/네트워크: SSH는 연결 즉시 종료 상태

## Supabase 상태
- 프로젝트 ref: `wazxzogbnmgqdrnussvc`
- 프로젝트 URL: `https://wazxzogbnmgqdrnussvc.supabase.co`
- supabase CLI: 설치됨 (`2.111.0`)
- `supabase projects list`: 실패 (`LegacyPlatformAuthRequiredError` 토큰 미제공)
- `supabase link --project-ref ...`: 실패 (`LegacyPlatformAuthRequiredError`)
- `migration list --linked`: 실패 (`LegacyProjectNotLinkedError`)
- `supabase status`: 로컬 컨테이너 미연결 (`No such container`)

## Migration 상태
- 신규 migration: `supabase/migrations/20260807093000_align_health_contracts.sql`
- 핵심 포인트: `health_get_dashboard(integer)`(권한: authenticated), `health_ingest_daily(...)`(권한: service_role)
- `search_path`가 `public`로 고정된 상태 확인됨

## Android 상태
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`에서 세션 미존재 시 업로드 차단 처리
- 업로드 payload는 `healthData` 래핑 후 Edge Function 직접 호출
- 실제 디바이스 E2E: 미실행(작업 환경상 대기)

## Web 상태
- `env.ts`, `supabaseHealthRepository.ts`, `syncStatus.ts`, `healthDataSource.ts`가 인증 기반 분기 및 오류 상태를 사용하도록 반영
- sample preview는 dev-only로만 허용
- 운영에서 fake/샘플 숫자 노출 차단 기준은 유지 중

## Edge Function 상태
- `supabase/functions/send-health-data/index.ts` 에서 `Authorization` 검사 활성
- `SUPABASE_SERVICE_ROLE_KEY` 기반 admin client 사용
- `verify_jwt`: true (`supabase/config.toml`)
- 배포 상태: 미배포

## OCI 상태
- SSH reachability: `Test-NetConnection 161.33.17.84:22` 성공
- `ssh` 시도: TCP 연결 후 `Connection closed by 161.33.17.84 port 22`
- 키 후보:
  - `C:\Users\dan18\Downloads\OCI_SSH.key` (SHA256: bM1ML...)
  - `C:\Users\dan18\OneDrive\바탕 화면\Keys\OCI_SSH.key` (SHA256: f90wU...)
- 정체 확인: 인증 직전 종료로 인해 서버측 key 정책/접근 정책 추가 진단 필요

## Git 상태
- local ahead: 3
- 수정 파일: `apps/health-web/src/services/{env.ts,supabaseHealthRepository.ts,syncStatus.ts,types.ts}`
- 미추적: `apps/health-web/public/maintenance/`, `apps/health-web/src/services/healthSamplePreview.ts`, `artifacts/`, `docs/health-atlas-restore-runbook.md`
- 마지막 커밋: `7ae798f` (`docs: record updated recovery checkpoint`)

## 남은 blocker
- SSH 사용자 인증 복구 전 원자적 운영 배포 불가
- Supabase CLI 토큰/OCI API 인증 미구성으로 원격 DB·RLS·RPC 실제 상태 미확인
- Android 실디바이스 및 통합 E2E 미완료

## NEXT COMMAND
- SUPABASE_ACCESS_TOKEN 또는 OCI API credential 확보 후 `supabase link`, `supabase migration list --linked`, DB 검사(RLS/RPC/health_data) 재개
