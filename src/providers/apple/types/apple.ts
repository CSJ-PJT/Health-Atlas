export interface AppleHealthProviderConfig {
  appId: string;
  teamId: string;
  redirectUri: string;
  apiBaseUrl?: string;
  accessToken?: string;
}

export interface AppleHealthDailySummary {
  steps?: number;
  distanceMeters?: number;
  activeCalories?: number;
  basalCalories?: number;
  sleepMinutes?: number;
  sleepScore?: number;
  averageHeartRate?: number;
  restingHeartRate?: number;
  hrvAverage?: number;
  hrvStatus?: string;
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  vo2Max?: number;
  hydrationMl?: number;
}

export interface AppleHealthWorkout {
  id?: string;
  name?: string;
  activityType?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  distanceMeters?: number;
  calories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageSpeedMetersPerSecond?: number;
  elevationGainMeters?: number;
}

export interface AppleHealthSleepSession {
  startTime?: string;
  endTime?: string;
  totalMinutes?: number;
  deepMinutes?: number;
  coreMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
}

export interface AppleHealthNutritionEntry {
  consumedAt?: string;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  name?: string;
}

export interface AppleHealthHydrationEntry {
  consumedAt?: string;
  milliliters?: number;
}

export interface AppleHealthDailyPayload {
  summary?: AppleHealthDailySummary;
  workouts?: AppleHealthWorkout[];
  sleep?: AppleHealthSleepSession[];
  nutrition?: AppleHealthNutritionEntry[];
  hydration?: AppleHealthHydrationEntry[];
}
