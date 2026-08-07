# Health Atlas Recovery State

## 작업 기준
- BRANCH: `fix/health-atlas-live-sync`
- LOCAL_HEAD: `a1d2f2165cb9fc754b47a7567af308d3e64574fd`
- REMOTE_FEATURE_HEAD: `origin/fix/health-atlas-live-sync` (`4d7f4e165497242472565fcc86f6a4cf85f2da52`)
- ORIGIN_MAIN: `origin/main` (`ddf22f7a93db57fdba618e31695b4ee9541f4c6e`)
- LOCAL_AHEAD: `6`
- WORKTREE_STATUS: `?? apps/health-web/public/maintenance/, ?? apps/health-web/src/services/healthSamplePreview.ts, ?? artifacts/, ?? docs/health-atlas-restore-runbook.md`

## 상태 스냅샷
- SUPABASE_STATUS: `blocked_cli_missing` (`where.exe supabase` 미탐지)
- SUPABASE_LINK_STATUS: `blocked_cli_missing`
- SSH_STATUS: `tcp_open` (`Test-NetConnection 161.33.17.84 -Port 22`), `connection_closed_after_kex` in prior attempts, key candidate mismatch 미확정
- OCI_API_STATUS: `blocked` (`oci` 미탐지, 공식 OCI API key는 Task/Gmail에 있으나 실행 수단 미확정)
- EDGE_FUNCTION_STATUS: `source_verify_jwt_set` (`supabase/config.toml` 기준), `remote_deploy_unverified`
- MIGRATION_STATUS: `20260807093000_align_health_contracts.sql exists`, `migration_apply_unverified` (remote link unavailable)
- WEB_BUILD_STATUS: `not_checked`
- OPERATING_ASSET: `https://161.33.17.84/health/` assets observed: `index-C8KzMeNX.js`, `index-phMhBGPF.css`

## 공식 소스 정합
- Task source: `C:\Users\dan18\OneDrive\바탕 화면\Task\Info\Server login info.txt` confirms `opc@161.33.17.84` and key path `C:\Users\dan18\Downloads\OCI_SSH.key`.
- Gmail source: subject `OCI 기본정보` confirms `Route Atlas` host mapping and OCI API metadata block.
- 키 후보: `C:\Users\dan18\Downloads\OCI_SSH.key` (`SHA256:bM1MLuiHgZ3NImA4g4O6psV70qZKl560EZuZjklA2cc`) and `C:\Users\dan18\OneDrive\바탕 화면\Keys\OCI_SSH.key` (`SHA256:f90wUd9c/meeVZPp6kQWCRw4FanJriioK/BNwsU23Pg`) evaluated.

## 완료 Gate
- Gate 0~4: Git/remote baseline, Task/Gmail/키 후보 정합 완료
- Gate 5 미완료: Git push 인증, OCI API/SSH 인증 루트(키 확정), Supabase 실인증·배포 전 단계

## 인증/연결 진단
- Git Push: HTTPS auth 타임아웃 반복. `ls-remote`는 public 조회는 통과, `push`는 응답 대기 타임아웃(인증 라운드 진입 없이).
- Git Credential store: Windows Credential manager에 GitHub 계정 기록 없음.
- SSH 인증 진단: `ssh -vvv` 출력에서 `SSH2_MSG_KEXINIT sent` 후 `Connection closed`로 종료, 사용자인증 단계 미도달.
- 키 fingerprint: 공식 지문(`88:3c:09...`)과 일치 키 후보 미탐지.
- `OCI Info.txt`, `Server login info.txt`, Gmail 본문은 user/host mapping은 일치하나 key/credential 단에서 불일치 추정.

## Git 상태
- 현재 remote ahead 관계: local ahead `6`, push 시도는 타임아웃으로 `authenticate/handshake` 대기 추정
- `origin` URL: `https://github.com/CSJ-PJT/Health-Atlas.git`

## NEXT_STEP
1. GitHub 인증 경로 보정 후 push 1회 단일 재시도
2. OCI API 임시 인증 설정 생성 후 인스턴스 161.33.17.84 검증
3. 필요시 OCI console 경로로 SSH 접근 복구
4. Supabase CLI 또는 관리 경로 복구 후 migration/DB/RPC/rls 점검
5. Health-web build/test 단계로 이동
