export type ProviderId = "samsung" | "garmin" | "apple-health" | "strava";

export type HealthViewMode = "day" | "week" | "month" | "year";

export interface ProviderConnectionStatus {
  connected: boolean;
  available: boolean;
  requiresPermission?: boolean;
  lastSyncAt?: string | null;
}

export interface NormalizedHealthData {
  steps_data: {
    count: number;
    distance: string;
    calories: number;
    floorsClimbed?: number;
    movingMinutes?: number;
  };
  exercise_data: Array<{
    type: string;
    duration: number;
    calories: number;
    exerciseType?: string | number;
    distance?: number;
    startTime?: string;
    endTime?: string;
    averageHeartRate?: number;
    maxHeartRate?: number;
    averageSpeed?: number;
    maxSpeed?: number;
    averagePaceSecondsPerKilometer?: number;
    elevationGainMeters?: number;
    elevationLossMeters?: number;
  }>;
  sleep_data: {
    totalMinutes: number;
    stages?: unknown;
    score?: number;
    hrvStatus?: string;
    hrvAverage?: number;
  };
  body_composition_data: {
    weight: number;
    bodyFat: number;
    bmi?: number;
    skeletalMuscleMass?: number;
  };
  nutrition_data: {
    calories: number;
    nutrition: unknown[];
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
  };
  heart_rate: number;
  resting_heart_rate?: number;
  hydration: unknown[];
  vo2max: unknown[];
  source_metrics?: Record<string, unknown>;
}

export interface HealthProvider {
  id: ProviderId;
  displayName: string;
  isAvailable(): Promise<boolean>;
  getConnectionStatus(): Promise<ProviderConnectionStatus>;
  connect(): Promise<void>;
  getTodayData(): Promise<NormalizedHealthData>;
}
