# Health Atlas Recovery State

## 현재 작업 복구
- CURRENT BRANCH: `fix/health-atlas-live-sync`
- BASE MAIN: `origin/main` (`ddf22f7`)
- LOCAL START HEAD: `7ae798f05d6c66dac2f704211306bbf5a41b6627`
- CURRENT HEAD: `49483d0e22e8ef9954c0b9936d851cf333624fe3`
- REMOTE HEAD: `origin/fix/health-atlas-live-sync` (`4d7f4e1`) (local ahead 5)

## 마지막 완료 Gate
- Gate 0: Git/브랜치/원격 기본 상태 점검 완료
- Gate 1: 운영 기준선 및 로컬 상태 재확인 완료
- Gate 2: 인증 계약 정합성 패치 반영 및 체크포인트 문서화
- Gate 2.5: 현재 변경 파일 점검 및 회복 상태 동기화 완료
- Gate 3: Task 폴더 + Gmail 공식 소스(ssh/oci/host mapping) 재확보 완료
- Gate 4: 운영 `/health` 및 `health-status.json` baseline 재확인 완료

## 현재 운영 상태
- URL: `https://161.33.17.84/health/`
- HTTP: `200`
- `health-status.json`(운영): `service=Health Atlas`, `status=maintenance`, `publicDashboard=false`, `sampleDataEnabled=false`, `message=Authenticated health sync recovery in progress`
- 현재 `index`: `/health/assets/index-C8KzMeNX.js`, `/health/assets/index-phMhBGPF.css`
- `Console/네트워크`: SSH는 연결 즉시 종료 패턴

## Supabase 상태
- 프로젝트 ref: `wazxzogbnmgqdrnussvc`
- 프로젝트 URL: `https://wazxzogbnmgqdrnussvc.supabase.co`
- supabase CLI: 설치됨 (`2.111.0`)
- `supabase projects list`: 실패 (`LegacyPlatformAuthRequiredError` 토큰 미제공)
- `supabase link`: 실패 (`LegacyPlatformAuthRequiredError`)
- `supabase link --project-ref ...`: 실패 (`LegacyPlatformAuthRequiredError`)
- `migration list --linked`: 실패 (`LegacyProjectNotLinkedError`)
- `supabase status`: 로컬 컨테이너 미연결 (`No such container`)

## Migration 상태
- 신규 migration: `supabase/migrations/20260807093000_align_health_contracts.sql`
- 핵심 포인트: `health_get_dashboard(integer)`(`authenticated`), `health_ingest_daily(timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb)`(`service_role`)
- `search_path = public`, `revoke/public` 및 `grant` 정합성 점검 예정

## Android 상태
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`에서 세션 미존재 시 업로드 차단 처리 확인
- 업로드 payload는 `healthData` 래핑 후 Edge Function 호출 경로
- 실제 디바이스 E2E: 미실행(작업 환경상 대기)

## Web 상태
- `env.ts`, `supabaseHealthRepository.ts`, `syncStatus.ts`, `healthDataSource.ts` 반영
- sample preview는 dev-only 허용으로 제한
- fake/샘플 숫자 노출 차단 기준은 유지

## Edge Function 상태
- `supabase/functions/send-health-data/index.ts`: `verify_jwt` 기본값 false 아님 (`supabase/config.toml`에서 true)
- 토큰 검증: Authorization 헤더 기반 Bearer 토큰 필수 확인
- 입력 스키마는 `raw` payload 크기 제한, `syncedAt` 제한 반영
- 배포 상태: 미배포(원격 배포 검증 전)

## OCI 상태
- SSH reachability: `Test-NetConnection 161.33.17.84 -Port 22` 성공
- SSH 시도: TCP 연결 후 `Connection closed by 161.33.17.84 port 22`
- Task / Gmail 공식 매핑: `opc@161.33.17.84` (Atlas), 키 경로 우선 `C:\Users\dan18\Downloads\OCI_SSH.key`
- 공식 키 지문(상대 비교):
  - `C:\Users\dan18\Downloads\OCI_SSH.key` (`SHA256:bM1ML...`)
  - `C:\Users\dan18\OneDrive\바탕 화면\Keys\OCI_SSH.key` (`SHA256:f90wU...`)
- 정체: 인증 단계 이전 종료 반복. 서버측 정책/키 승인/sshd 접근 정책 추가 진단 필요

## Git 상태
- local ahead: 5
- 수정 파일: `docs/health-atlas-recovery-state.md`, `apps/health-web/src/services/{env.ts,supabaseHealthRepository.ts,syncStatus.ts,types.ts}`
- 미추적: `apps/health-web/public/maintenance/`, `apps/health-web/src/services/healthSamplePreview.ts`, `artifacts/`, `docs/health-atlas-restore-runbook.md`
- 마지막 커밋: `49483d0` (`docs: correct recovery checkpoint metadata`)

## 남은 blocker
- SSH 복구 전 원자적 운영 배포 및 운영 smoke 보류
- Supabase Access Token / OCI API credential 미구성으로 원격 DB·RLS·RPC 실검증 미완료
- Android 실기기 및 통합 E2E 미완료

## NEXT COMMAND
- OCI credential(공식 키페어/메타) 기반 SSH 경로 정합 → `ssh` 재시도 또는 OCI console/API 대체 경로 복구 → `supabase link`, `migration list --linked`, DB 감사(RLS/RPC/health_data) 연계 진행