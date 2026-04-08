import HealthConnect from "@/lib/health-connect/plugin";

export interface HealthSummary {
  steps: Array<{ count: number; startTime: string; endTime: string }>;
  totalSteps?: number;
  distanceMeter?: number;
  activeCaloriesKcal?: number;
  activeCaloriesSource?: string;
  totalBurnedCaloriesKcal?: number;
  heartRate: Array<{ bpm: number; time: string }>;
  exercises: Array<{
    title: string | null;
    exerciseType: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    distanceMeter: number;
    caloriesKcal: number;
  }>;
  sleepSessions: Array<{
    title?: string | null;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
  body: {
    weight: Array<{ kg: number; time: string }>;
    bodyFat: Array<{ percentage: number; time: string }>;
  };
  nutrition: Array<{
    time: string;
    energyKcal: number;
    proteinGrams: number;
    fatGrams: number;
    carbsGrams: number;
  }>;
  totalIntakeKcal?: number;
  sleepMinutes?: number;
  exerciseMinutes?: number;
  exerciseDistanceMeter?: number;
}

export interface CheckPermissionsResult {
  hasAllPermissions: boolean;
  hasAll?: boolean;
  granted: string[];
  missing: string[];
  requiredCount?: number;
  grantedCount?: number;
}

export { HealthConnect };
