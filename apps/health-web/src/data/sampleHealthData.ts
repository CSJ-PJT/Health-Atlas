import type { ActivityMetric, BodyMetric, HealthSummary, SleepMetric, SyncStatus } from "../types";

export const healthSummary: HealthSummary = {
  dateLabel: "오늘",
  totalScore: 82,
  steps: 9420,
  activeCalories: 610,
  restingHeartRate: 58,
};

export const bodyMetric: BodyMetric = {
  label: "체중",
  value: "68.4 kg",
  trend: "최근 7일 평균 대비 -0.3 kg",
};

export const activityMetric: ActivityMetric = {
  label: "운동",
  durationMinutes: 48,
  distanceKm: 7.2,
  intensity: "moderate",
};

export const sleepMetric: SleepMetric = {
  label: "수면",
  durationHours: 7.1,
  quality: "steady",
};

export const syncStatuses: SyncStatus[] = [
  {
    source: "최근 동기화 상태",
    status: "pending",
    message: "Android 앱 데이터 연결 대기 중",
    updatedAt: "sample data",
  },
  {
    source: "Supabase 연결 상태",
    status: "inactive",
    message: "환경 변수가 없으면 비활성으로 표시",
    updatedAt: "build-time check",
  },
  {
    source: "Android Health Connect 연동 예정",
    status: "pending",
    message: "기존 native layer 또는 Android 앱에서 수집한 데이터를 API/Supabase로 연결 예정",
    updatedAt: "planned",
  },
];
