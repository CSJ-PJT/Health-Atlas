# Health Atlas Recovery State

## 현재 작업 복구
- 현재 Branch: `fix/health-atlas-live-sync`
- Base Main: `origin/main` (`ddf22f7`)
- 시작 HEAD: `4d7f4e165497242472565fcc86f6a4cf85f2da52`
- 현재 HEAD: `3af139a5f8bd2f1e5f3f7d0f5f1e6f6e4a0f3d2b`
- Remote Feature: `origin/fix/health-atlas-live-sync` (local ahead 1)

## 마지막 완료 Gate
- Gate 0: Git/branch/remote 상태 확인 완료
- Gate 1: local 상태 재확인 및 운영 기준선 조회 완료
- Gate 2: 건강 계약 정합성 패치 반영 및 커밋 완료 (`eb3cec8`)

## 현재 운영 상태
- URL: `https://161.33.17.84/health/` (HTTP 200)
- `health-status.json`: status=`waiting_backend`, publicDashboard=`true`, liveData=`false`
- `index.html` 기준: `/health/assets/index-C8KzMeNX.js`, `/health/assets/index-phMhBGPF.css`
- maintenance 페이지 존재: `/health/maintenance/index.html`

## Supabase 상태
- project_id: `wazxzogbnmgqdrnussvc`
- `supabase status`: 로컬 컨테이너 미연결 (`No such container`)
- `migration list --linked`: 미연결 (`Cannot find project ref`)
- 원격 API/DB 상태 검증은 추가 필요

## Migration 상태
- 신규 migration 추가: `supabase/migrations/20260807093000_align_health_contracts.sql`
- 이전 migration 중 `health_ingest_daily(p_user_id...)` 잔존 (본 migration으로 상위 덮어쓰기)

## Android 상태
- `apps/health-app/src/providers/shared/services/healthDataRepository.ts`의 저장 payload를 `null` 기반으로 보강
- `saveHealthSnapshot`에서 세션 체크 추가
- 실제 기기 Android E2E는 미실행

## Web 상태
- 로그인 UX 문구 정리 및 에러 문구 가드 강화
- 실제 데이터 부재 시 마지막 동기화 표시를 `없음`으로 변경
- `health-status.json` 실동작 전 상태로 설정

## Edge Function 상태
- `supabase/functions/send-health-data/index.ts`: `health_ingest_daily` 호출에서 `p_user_id` 제거
- `supabase/config.toml`: `verify_jwt = true`
- 배포/검증: 미배포

## OCI 상태
- Test-NetConnection 161.33.17.84:22 = True
- ssh -vvv handshake: TCP 연결 후 `Connection closed by 161.33.17.84 port 22`
- 키 로드/인증 단계 종료 가능성 높음, 배포 불가 상태

## Git 상태
- 로컬 ahead: 1 commit
- 원격 푸시: 시도했으나 타임아웃으로 미완료
- 관련 commit: `eb3cec8`

## 남은 blocker
- Supabase 프로젝트 ACTIVE 및 live 데이터 검증 미완료
- Android 실기기 E2E 미완료
- SSH 인증 복구 전 운영 배포 보류
