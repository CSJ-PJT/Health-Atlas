# Health Atlas Restore Runbook

## Recovery Preconditions
1. Supabase project ACTIVE
2. Web production env configured
3. 로그인 성공
4. Android authenticated upload 성공
5. 신규 row의 `user_id` 정상 저장
6. `health_get_dashboard` RPC 호출 성공
7. 사용자 격리 정책(A/B) 통과
8. 실제 건강 데이터 표시
9. sample 자동 fallback 비노출
10. 운영 모바일 E2E 통과

## Immediate Health Atlas Maintenance Rollout
- `VITE_ENABLE_SAMPLE_PREVIEW=false` (기본값)
- `/health/` 경로는 점검 페이지 제공
- `/health/health-status.json`은 운영점검 상태 고정
- Nginx에서 `503` + `Retry-After` 반환

## 복구 절차
1. 운영 점검 종료 시점 판단
2. Health 웹 최신 빌드
3. 운영 경로 백업(`health-backup-maintenance-YYYYMMDDHHMMSS`) 확인
4. maintenance 파일 제거 준비
5. 기존 배포 백업 교체 원칙에 따라 원자적 교체
6. Nginx Health location 원래 라우트 복구
7. `nginx -t` + `nginx -s reload`
8. `/health/`, `/health/health-status.json`, `/health/` 하위 API smoke 검증
9. `Atlas Management` 카드 상태 normal 전환

## Validation Checklist
- sample dashboard 비노출
- 사용자별 인증 동기화/조회 pipeline 동작
- `service` 응답 `maintenance` 여부 확인
- 동시 점검/복구 문구 오탐 없음
