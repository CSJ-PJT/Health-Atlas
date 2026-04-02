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
  };
  exercise_data: Array<{
    type: string;
    duration: number;
    calories: number;
    exerciseType?: string | number;
    distance?: number;
  }>;
  sleep_data: {
    totalMinutes: number;
    stages?: unknown;
  };
  body_composition_data: {
    weight: number;
    bodyFat: number;
  };
  nutrition_data: {
    calories: number;
    nutrition: unknown[];
  };
  heart_rate: number;
  hydration: unknown[];
  vo2max: unknown[];
}

export interface HealthProvider {
  id: ProviderId;
  displayName: string;
  isAvailable(): Promise<boolean>;
  getConnectionStatus(): Promise<ProviderConnectionStatus>;
  connect(): Promise<void>;
  getTodayData(): Promise<NormalizedHealthData>;
}
