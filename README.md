# RH 헬스케어 모노레포

이 저장소는 독립적으로 배포할 수 있는 두 앱을 포함한 모노레포입니다.

- `apps/health-app`
- `apps/fifth-dawn-game`

RH 헬스케어 앱은 원본 건강 데이터, 공급자 동기화, 분석, AI 코칭, 소셜, 관리자 기능, 게임 연동 파생값의 기준 앱입니다.

독립 실행형 게임 앱은 전용 연동 계층을 통해 게임에 안전한 파생값만 사용합니다. 원본 건강 기록은 직접 읽지 않습니다.

## 전환 안내

저장소 루트에는 모노레포 전환 이전의 소스와 모바일 셸 파일이 남아 있습니다. 새 제품 작업은 다음 위치를 기준으로 진행합니다.

- `apps/health-app`
- `apps/fifth-dawn-game`

루트 소스 트리는 전환용 영역이며, 마이그레이션 작업에 명시적으로 필요할 때만 수정합니다.

## 작업 공간 구조

```text
apps/
  health-app/
  fifth-dawn-game/
packages/
  shared-auth/
  shared-profile/
  shared-types/
  game-link-sdk/
  design-system/
supabase/
  migrations/
docs/
  monorepo-architecture.md
  life-sim-mode.md
```

## 앱

### RH 헬스케어 앱

주요 역할:

- 건강 데이터 공급자 동기화와 정규화된 건강 데이터 관리
- AI 코칭과 분석
- 소셜 기능과 관리자 흐름
- 가벼운 게임 연동 관리

헬스케어 앱 안의 게임 관련 UI는 의도적으로 작게 유지합니다.

- 게임 계정 연결과 연결 해제
- 게임용 파생값 미리보기
- 연동된 미션과 보상 확인

### Fifth Dawn 게임

주요 역할:

- 독립 실행형 탑다운 생활 시뮬레이션 RPG 버티컬 슬라이스
- 전체 화면 플레이 표면
- 로컬 우선 저장 시스템과 선택적 클라우드 저장 연동
- 게임 연동 파생값 기반 선택 보너스

## 명령어

저장소 루트에서 실행합니다.

```bash
npm run dev:health
npm run dev:game
npm run build:health
npm run build:game
npm run typecheck:health
npm run typecheck:game
npm test
```

## 환경 변수

`.env.example`을 `.env`로 복사한 뒤 다음 값을 설정합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 데이터베이스

마이그레이션은 다음 명령으로 적용합니다.

```bash
npx supabase db push
```

최근 모노레포와 게임 연동 작업에는 다음 항목이 포함됩니다.

- 게임 계정 연결 테이블
- 게임 연동 프로필 파생값 저장소
- 미션과 보상 동기화 테이블
- 독립 실행형 생활 시뮬레이션 클라우드 저장 옵션

참고 문서:

- `docs/monorepo-architecture.md`
- `docs/life-sim-mode.md`

## 보안 메모

- 게임은 원본 건강 데이터 행을 사용하면 안 됩니다.
- 연동 계층은 활동, 수면, 회복, 수분, 일관성, 공명 같은 파생 파라미터만 노출합니다.
- 새 연동 테이블은 RLS와 RPC 기반 접근을 사용합니다.
- 현재 클라이언트 식별은 기존 앱 프로필/사용자 모델을 기반으로 하므로, 연동 RPC 정책은 정식 인증이 더 강화되기 전까지의 전환 단계 설계입니다.
