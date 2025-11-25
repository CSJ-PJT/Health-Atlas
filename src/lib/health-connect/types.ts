/**
 * Health Connect Plugin Types
 * Kotlin 플러그인에서 반환하는 모든 데이터 구조를 TypeScript로 정의
 */

// ============= Status & Permission Types =============

export interface HealthConnectStatus {
  status: number;
  statusText: 'AVAILABLE' | 'UNAVAILABLE' | 'PROVIDER_UPDATE_REQUIRED' | 'UNKNOWN';
}

export interface HealthConnectPermissionStatus {
  hasAll: boolean;
  granted: string[];
  requiredCount: number;
  grantedCount: number;
}

// ============= Aggregate Data Types =============

export interface HealthConnectAggregate {
  steps: number;
  distanceMeter: number;
  activeCaloriesKcal: number;
  exerciseDurationMinutes: number;
  sleepDurationMinutes: number;
}

// ============= Heart Rate Types =============

export interface HeartRateSample {
  bpm: number;
  time: string; // ISO 8601 format
}

// ============= Exercise Session Types =============

export interface ExerciseSessionWithCalories {
  title: string | null;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  exerciseType: number;
  caloriesKcal: number;
}

// ============= Sleep Session Types =============

export interface SleepStageSummary {
  deepMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
}

export interface SleepSessionWithStages {
  title: string | null;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  notes: string | null;
  stages: SleepStageSummary;
}

// ============= Body Composition Types =============

export interface WeightEntry {
  time: string; // ISO 8601 format
  weightKg: number;
}

export interface BodyFatEntry {
  time: string; // ISO 8601 format
  percentage: number;
}

export interface Vo2MaxEntry {
  time: string; // ISO 8601 format
  vo2mlPerKgMin: number;
}

// ============= Hydration Types =============

export interface HydrationEntry {
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  volumeLiters: number;
}

// ============= Nutrition Types =============

export interface NutritionEntry {
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  mealType: number;
  name: string;
  energyKcal: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

// ============= Today Snapshot (Complete) =============

export interface TodaySnapshot {
  aggregate: HealthConnectAggregate;
  heartRate: HeartRateSample[];
  exerciseSessions: ExerciseSessionWithCalories[];
  sleepSessions: SleepSessionWithStages[];
  weight: WeightEntry[];
  bodyFat: BodyFatEntry[];
  vo2max: Vo2MaxEntry[];
  hydration: HydrationEntry[];
  nutrition: NutritionEntry[];
}

// ============= Range Snapshot Options =============

export interface SnapshotRangeOptions {
  start: string; // ISO 8601 format: "2025-11-21T00:00:00Z"
  end: string;   // ISO 8601 format: "2025-11-21T23:59:59Z"
}
