export interface GarminProviderConfig {
  apiBaseUrl: string;
  accessToken: string;
  userId: string;
}

export interface GarminDailySummary {
  steps?: number;
  distanceMeters?: number;
  activeCalories?: number;
  restingCalories?: number;
  sleepMinutes?: number;
  restingHeartRate?: number;
  averageHeartRate?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  hydrationMl?: number;
  vo2Max?: number;
  caloriesConsumed?: number;
}

export interface GarminActivity {
  id?: string;
  name?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  distanceMeters?: number;
  calories?: number;
  averageHeartRate?: number;
}

export interface GarminSleepSession {
  startTime?: string;
  endTime?: string;
  totalMinutes?: number;
  deepMinutes?: number;
  lightMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
}

export interface GarminNutritionEntry {
  mealName?: string;
  consumedAt?: string;
  calories?: number;
  proteinGrams?: number;
  fatGrams?: number;
  carbsGrams?: number;
}

export interface GarminHydrationEntry {
  consumedAt?: string;
  milliliters?: number;
}

export interface GarminDailyPayload {
  summary?: GarminDailySummary;
  activities?: GarminActivity[];
  sleep?: GarminSleepSession[];
  nutrition?: GarminNutritionEntry[];
  hydration?: GarminHydrationEntry[];
}
