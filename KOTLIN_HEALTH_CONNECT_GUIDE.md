# Health Connect Kotlin 플러그인 가이드

## 📦 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. Android 플랫폼 추가 (최초 1회)
npx cap add android

# 3. Android 플랫폼 업데이트
npx cap update android

# 4. 프로젝트 빌드
npm run build

# 5. Capacitor 동기화
npx cap sync android

# 6. Android Studio에서 열기
npx cap open android

# 7. Android Studio에서 실행
# - 에뮬레이터 또는 실제 디바이스 선택
# - Run 버튼 클릭
```

## 📊 데이터 구조 매핑

### Kotlin → TypeScript 완전 매핑

| Kotlin 반환값 | TypeScript 타입 | 설명 |
|-------------|----------------|------|
| `aggregate.steps` | `number` | 걸음수 |
| `aggregate.distanceMeter` | `number` | 거리 (미터) |
| `aggregate.activeCaloriesKcal` | `number` | 활동 칼로리 (kcal) |
| `aggregate.exerciseDurationMinutes` | `number` | 운동 시간 (분) |
| `aggregate.sleepDurationMinutes` | `number` | 수면 시간 (분) |
| `heartRate[]` | `HeartRateRecord[]` | 심박수 샘플 배열 |
| `exerciseSessions[]` | `ExerciseSessionRecord[]` | 운동 세션 배열 |
| `sleepSessions[]` | `SleepSessionRecord[]` | 수면 세션 배열 |
| `weight[]` | `WeightRecord[]` | 체중 기록 배열 |
| `bodyFat[]` | `BodyFatRecord[]` | 체지방 기록 배열 |
| `vo2max[]` | `Vo2MaxRecord[]` | VO2 Max 기록 배열 |
| `hydration[]` | `HydrationRecord[]` | 수분 섭취 기록 배열 |
| `nutrition[]` | `NutritionRecord[]` | 영양 기록 배열 |

## 🔧 사용 예제

### TypeScript에서 Health Connect 사용

```typescript
import { getTodayHealthData, checkHealthConnectAvailability, checkPermissions } from '@/lib/health-connect';

// 1. 사용 가능 여부 확인
const isAvailable = await checkHealthConnectAvailability();

// 2. 권한 확인
const permStatus = await checkPermissions();
console.log(`권한 상태: ${permStatus.grantedCount}/${permStatus.requiredCount}`);

// 3. 오늘 데이터 가져오기
const snapshot = await getTodayHealthData();

// 4. 데이터 활용
const avgHeartRate = snapshot.heartRate.reduce((sum, hr) => sum + hr.bpm, 0) / snapshot.heartRate.length;
const latestWeight = snapshot.weight[snapshot.weight.length - 1]?.weightKg;
const distanceKm = snapshot.aggregate.distanceMeter / 1000;
```

## 📝 화면 표시 권장 사항

### 기본 메트릭
```typescript
걸음수: snapshot.aggregate.steps
거리: (snapshot.aggregate.distanceMeter / 1000).toFixed(2) + ' km'
칼로리: Math.round(snapshot.aggregate.activeCaloriesKcal) + ' kcal'
운동 시간: snapshot.aggregate.exerciseDurationMinutes + ' 분'
수면 시간: (snapshot.aggregate.sleepDurationMinutes / 60).toFixed(1) + ' 시간'
평균 심박수: Math.round(평균값) + ' bpm'
체중: snapshot.weight[최신].weightKg + ' kg'
체지방률: snapshot.bodyFat[최신].percentage + ' %'
```

### 고급 메트릭
```typescript
VO2 Max: snapshot.vo2max[최신].vo2mlPerKgMin + ' ml/kg/min'
수분 섭취: snapshot.hydration.reduce((sum, h) => sum + h.volumeLiters, 0) + ' L'
총 단백질: snapshot.nutrition.reduce((sum, n) => sum + n.proteinGrams, 0) + ' g'
총 탄수화물: snapshot.nutrition.reduce((sum, n) => sum + n.carbsGrams, 0) + ' g'
총 지방: snapshot.nutrition.reduce((sum, n) => sum + n.fatGrams, 0) + ' g'
```

## ⚠️ 주의사항

1. **권한 요청**: Health Connect 권한은 앱 최초 실행 시 사용자에게 요청해야 합니다.
2. **데이터 없음 처리**: 일부 사용자는 특정 데이터를 기록하지 않을 수 있습니다 (빈 배열 처리).
3. **시간대**: 모든 시간은 ISO 8601 문자열 형식으로 반환됩니다.
4. **Android API 레벨**: Health Connect는 Android 8.0 (API 26) 이상 필요.

## 🚀 향후 개선 가능 항목

1. **수면 단계 상세 정보** (deepSleep, lightSleep, remSleep)
2. **운동별 칼로리 분리** (현재는 전체 칼로리만 제공)
3. **기간별 데이터 조회** (`getSnapshotForRange` 구현)
4. **데이터 쓰기 기능** (writeHealthData)
