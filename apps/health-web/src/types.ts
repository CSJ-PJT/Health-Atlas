export type HealthDataSourceMode = "sample" | "supabase" | "unconfigured" | "error";

export type HealthLoadMode = "loading" | "signed_out" | "signed_in" | "backend_unavailable" | "error";

export type HealthSummary = {
  date: string;
  score: number | null;
  steps: number;
  activeCalories: number;
  restingHeartRate: number;
  weightKg: number;
  sleepHours: number;
  activityMinutes: number;
  source: string;
  syncedAt: string;
  statusMessage: string;
};

export type BodyMetric = {
  date: string;
  weightKg: number;
  source: string;
  syncedAt: string;
};

export type ActivityMetric = {
  date: string;
  steps: number;
  activeCalories: number;
  activityMinutes: number;
  source: string;
  syncedAt: string;
};

export type SleepMetric = {
  date: string;
  sleepHours: number;
  source: string;
  syncedAt: string;
};

export type SyncStatus = {
  source: string;
  status: "connected" | "pending" | "inactive" | "error";
  syncedAt: string;
  statusMessage: string;
};

export type HealthTrendPoint = {
  date: string;
  score: number | null;
  steps: number;
  activeCalories: number;
  restingHeartRate: number;
  weightKg: number;
  sleepHours: number;
  activityMinutes: number;
  source: string;
  syncedAt: string;
  statusMessage: string;
};

export type HealthDashboardData = {
  mode: HealthDataSourceMode;
  loadMode: HealthLoadMode;
  source: string;
  syncedAt: string;
  statusMessage: string;
  summary: HealthSummary;
  trend: HealthTrendPoint[];
  bodyMetrics: BodyMetric[];
  activityMetrics: ActivityMetric[];
  sleepMetrics: SleepMetric[];
  syncStatuses: SyncStatus[];
};

export type HealthQueryStatus =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "BACKEND_INACTIVE"
  | "SCHEMA_UNAVAILABLE"
  | "PERMISSION_DENIED"
  | "NO_DATA"
  | "NETWORK_ERROR"
  | "UNKNOWN";
