# RH Healthcare Monorepo

RH Healthcare와 연동형 게임 클라이언트를 함께 관리하는 모노레포입니다.

건강 데이터 수집과 분석은 헬스케어 앱이 담당하고, 게임은 별도 연동 계층을 통해 원본 건강 기록이 아닌 안전하게 가공된 파생값만 사용합니다.

## 구성

```text
apps/
  health-app/              # RH Healthcare
  fifth-dawn-game/         # 독립 실행형 생활 시뮬레이션 RPG
  deepstake-web-prototype/ # 웹 기반 세계/시스템 실험
packages/
  shared-auth/
  shared-profile/
  shared-types/
  game-link-sdk/
  design-system/
supabase/
  migrations/
docs/
unity/
  DeepStake3D/
```

## 주요 애플리케이션

### RH Healthcare

건강 데이터를 수집·정규화하고 사용자에게 분석 결과를 제공하는 기준 애플리케이션입니다.

주요 기능:

- Android Health Connect 기반 건강 데이터 수집
- 공급자별 데이터 정규화
- 일일 활동·수면·회복 데이터 조회
- AI 코칭과 분석
- 소셜 및 관리자 기능
- 게임 연동용 파생값 생성

헬스케어 앱 내부의 게임 기능은 연결 상태와 요약 정보 확인 수준으로 제한합니다.

### Fifth Dawn

헬스케어 앱과 분리된 독립 실행형 생활 시뮬레이션 RPG입니다.

주요 기능:

- 전체 화면 플레이 환경
- 로컬 우선 저장
- 선택적 클라우드 저장
- 건강 데이터 파생값 기반 보너스
- 미션 및 보상 연동

게임은 원본 건강 데이터를 직접 조회하지 않습니다.

### DeepStake Web Prototype

세계 데이터, 상호작용, 건설, 상태 전이 같은 시스템을 빠르게 검증하기 위한 웹 프로토타입입니다.

Unity 구현과 별도로 동작하며, 데이터 구조와 게임 루프를 가볍게 실험하는 용도로 사용합니다.

## 데이터 흐름

```text
Health Connect / 외부 공급자
        |
        v
RH Healthcare
  - 수집
  - 정규화
  - 분석
        |
        v
Game Link Layer
  - 활동
  - 수면
  - 회복
  - 수분
  - 일관성
        |
        v
Fifth Dawn / DeepStake3D
```

## 개발 기준 경로

현재 제품 작업은 다음 경로를 기준으로 진행합니다.

- `apps/health-app`
- `apps/fifth-dawn-game`
- `apps/deepstake-web-prototype`
- `unity/DeepStake3D`

저장소 루트의 일부 기존 소스는 모노레포 전환 과정에서 유지되는 호환 영역입니다. 신규 기능은 각 앱 디렉터리에 우선 반영합니다.

## 실행 명령어

저장소 루트에서 실행합니다.

```bash
npm install
npm run dev:health
npm run dev:game
npm run build:health
npm run build:game
npm run typecheck:health
npm run typecheck:game
npm test
```

앱별 상세 명령은 각 디렉터리의 `package.json`을 기준으로 확인합니다.

## 환경 변수

`.env.example`을 `.env`로 복사한 뒤 필요한 값을 설정합니다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

민감한 키는 저장소에 커밋하지 않습니다.

## 데이터베이스

Supabase migration은 다음 명령으로 적용합니다.

```bash
npx supabase db push
```

주요 데이터 영역:

- 사용자 및 프로필
- 건강 데이터 동기화
- 공급자별 수집 상태
- AI 분석 결과
- 게임 계정 연결
- 게임용 파생 프로필
- 미션과 보상
- 선택적 클라우드 저장

## Health Connect

Android 앱은 Health Connect 권한과 가용성을 확인한 뒤 일일 건강 데이터를 조회합니다.

구현 시 다음 원칙을 따릅니다.

- 권한 상태와 앱 설치 상태를 분리해 처리
- 데이터가 없는 경우와 권한 오류를 구분
- 네이티브 plugin 오류를 사용자 메시지와 로그로 분리
- 수집 원본과 화면 표시용 집계값을 분리

## 게임 연동 원칙

- 게임은 원본 건강 데이터 행을 사용하지 않습니다.
- 연동 계층은 활동, 수면, 회복, 수분, 일관성 등 파생 파라미터만 노출합니다.
- 사용자 연결과 해제 흐름을 명확히 분리합니다.
- 연동 테이블은 RLS와 RPC 기반 접근을 사용합니다.
- 인증이 완전히 확정되지 않은 흐름은 전환 단계로 문서화합니다.

## 보안

- Supabase service role key를 클라이언트에 포함하지 않습니다.
- 건강 원본 데이터는 게임 클라이언트에 전달하지 않습니다.
- 사용자별 데이터 접근은 RLS를 기본으로 합니다.
- 로그에 토큰, 비밀번호, 원본 건강 데이터 전체를 출력하지 않습니다.

## 문서

- [모노레포 아키텍처](docs/monorepo-architecture.md)
- [생활 시뮬레이션 모드](docs/life-sim-mode.md)
- [Unity DeepStake3D](unity/DeepStake3D/README.md)

## 현재 개발 방향

1. Health Connect 동기화 안정화
2. 공급자별 데이터 정규화
3. 건강 데이터 기반 분석 품질 개선
4. 게임 연동 파생값 경계 강화
5. Fifth Dawn과 DeepStake3D의 독립 실행성 유지
6. 웹 프로토타입과 Unity 구현 간 데이터 모델 정리

각 기능은 앱 간 책임을 분리하고, 데이터 경계를 명확히 유지하는 방향으로 확장합니다.
