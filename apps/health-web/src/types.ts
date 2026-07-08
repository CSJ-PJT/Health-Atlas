export type HealthSummary = {
  dateLabel: string;
  totalScore: number;
  steps: number;
  activeCalories: number;
  restingHeartRate: number;
};

export type BodyMetric = {
  label: string;
  value: string;
  trend: string;
};

export type ActivityMetric = {
  label: string;
  durationMinutes: number;
  distanceKm: number;
  intensity: "low" | "moderate" | "high";
};

export type SleepMetric = {
  label: string;
  durationHours: number;
  quality: "needs-attention" | "steady" | "restorative";
};

export type SyncStatus = {
  source: string;
  status: "connected" | "pending" | "inactive";
  message: string;
  updatedAt: string;
};
