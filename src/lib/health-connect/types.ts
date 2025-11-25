/**
 * Health Connect Plugin Types
 * Kotlin 플러그인에서 반환하는 모든 데이터 구조를 TypeScript로 정의
 */

// ============= Status & Permission Types =============

export interface HealthConnectStatus {
  status: number;
}

export interface PermissionStatus {
  hasAll: boolean;
  granted: string[];
  requiredCount: number;
  grantedCount: number;
}

// ============= Aggregate Data Types =============

export interface AggregateData {
  steps: number;
  distanceMeter: number;
  activeCaloriesKcal: number;
  exerciseDurationMinutes: number;
  sleepDurationMinutes: number;
}

// ============= Heart Rate Types =============

export interface HeartRateRecord {
  bpm: number;
  time: string;
}

// ============= Exercise Session Types =============

export interface ExerciseSessionRecord {
  title: string | null;
  startTime: string;
  endTime: string;
  exerciseType: number;
}

// ============= Sleep Session Types =============

export interface SleepSessionRecord {
  title: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
}

// ============= Body Composition Types =============

export interface WeightRecord {
  time: string;
  weightKg: number;
}

export interface BodyFatRecord {
  time: string;
  percentage: number;
}

export interface Vo2MaxRecord {
  time: string;
  vo2mlPerKgMin: number;
}

// ============= Hydration Types =============

export interface HydrationRecord {
  startTime: string;
  endTime: string;
  volumeLiters: number;
}

// ============= Nutrition Types =============

export interface NutritionRecord {
  startTime: string;
  endTime: string;
  mealType: number;
  name: string;
  energyKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

// ============= Today Snapshot (Complete) =============

export interface TodaySnapshot {
  aggregate: AggregateData;
  heartRate: HeartRateRecord[];
  exerciseSessions: ExerciseSessionRecord[];
  sleepSessions: SleepSessionRecord[];
  weight: WeightRecord[];
  bodyFat: BodyFatRecord[];
  vo2max: Vo2MaxRecord[];
  hydration: HydrationRecord[];
  nutrition: NutritionRecord[];
}

// ============= Range Snapshot Options =============

export interface SnapshotRangeOptions {
  start: string; // ISO 8601 format: "2025-11-21T00:00:00Z"
  end: string;   // ISO 8601 format: "2025-11-21T23:59:59Z"
}
