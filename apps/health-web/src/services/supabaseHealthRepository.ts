import { createClient } from "@supabase/supabase-js";

import type { HealthDashboardData, HealthSummary, HealthTrendPoint } from "../types";
import type { HealthWebEnvStatus } from "./env";
import { buildSyncStatuses } from "./syncStatus";

type JsonObject = Record<string, unknown>;

type HealthDataRow = {
  synced_at: string;
  steps_data: JsonObject | null;
  exercise_data: JsonObject[] | JsonObject | null;
  sleep_data: JsonObject | null;
  body_composition_data: JsonObject | null;
  nutrition_data: JsonObject | null;
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asArray(value: unknown): JsonObject[] {
  if (Array.isArray(value)) {
    return value.map((item) => asObject(item));
  }

  const objectValue = asObject(value);
  return Object.keys(objectValue).length > 0 ? [objectValue] : [];
}

function dateFromSyncedAt(syncedAt: string) {
  return syncedAt.slice(0, 10);
}

function calculateScore(point: Omit<HealthTrendPoint, "score" | "statusMessage">) {
  const stepScore = Math.min(40, Math.round((point.steps / 10000) * 40));
  const activityScore = Math.min(25, Math.round((point.activityMinutes / 60) * 25));
  const sleepScore = Math.min(25, Math.round((point.sleepHours / 8) * 25));
  const heartScore = point.restingHeartRate > 0 && point.restingHeartRate <= 65 ? 10 : 6;

  return Math.max(0, Math.min(100, stepScore + activityScore + sleepScore + heartScore));
}

function mapHealthDataRow(row: HealthDataRow): HealthTrendPoint {
  const stepsData = asObject(row.steps_data);
  const sleepData = asObject(row.sleep_data);
  const bodyData = asObject(row.body_composition_data);
  const exerciseItems = asArray(row.exercise_data);

  const exerciseCalories = exerciseItems.reduce((sum, item) => sum + asNumber(item.calories), 0);
  const activityMinutes = asNumber(stepsData.movingMinutes) || exerciseItems.reduce((sum, item) => sum + asNumber(item.duration), 0);
  const activeCalories = asNumber(stepsData.calories) || exerciseCalories;
  const sleepMinutes = asNumber(sleepData.totalMinutes);

  const basePoint = {
    date: dateFromSyncedAt(row.synced_at),
    steps: asNumber(stepsData.count) || asNumber(stepsData.steps),
    activeCalories: Math.round(activeCalories),
    restingHeartRate: asNumber(stepsData.restingHeartRate),
    weightKg: asNumber(bodyData.weight),
    sleepHours: Number((sleepMinutes / 60).toFixed(1)),
    activityMinutes: Math.round(activityMinutes),
    source: "supabase health_data",
    syncedAt: row.synced_at,
  };

  return {
    ...basePoint,
    score: calculateScore(basePoint),
    statusMessage: "Supabase health_data에서 읽은 read-only 요약입니다.",
  };
}

function fallbackNumber(value: number, fallback: number) {
  return value > 0 ? value : fallback;
}

function buildSummary(latest: HealthTrendPoint): HealthSummary {
  return {
    ...latest,
    restingHeartRate: fallbackNumber(latest.restingHeartRate, 58),
    weightKg: fallbackNumber(latest.weightKg, 0),
    sleepHours: fallbackNumber(latest.sleepHours, 0),
  };
}

export async function fetchSupabaseHealthDashboardData(env: HealthWebEnvStatus): Promise<HealthDashboardData> {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase URL or publishable key is missing.");
  }

  const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from("health_data")
    .select("synced_at,steps_data,exercise_data,sleep_data,body_composition_data,nutrition_data")
    .order("synced_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as HealthDataRow[]).filter((row) => row.synced_at);

  if (rows.length === 0) {
    throw new Error("No readable health_data rows were returned.");
  }

  const trend = rows.map(mapHealthDataRow).reverse().slice(-30);
  const latest = trend[trend.length - 1];
  const summary = buildSummary(latest);

  return {
    mode: "supabase",
    source: "supabase health_data",
    syncedAt: latest.syncedAt,
    statusMessage: "Supabase publishable key로 health_data를 read-only 조회했습니다.",
    summary,
    trend,
    bodyMetrics: trend.map(({ date, weightKg, source, syncedAt }) => ({
      date,
      weightKg,
      source,
      syncedAt,
    })),
    activityMetrics: trend.map(({ date, steps, activeCalories, activityMinutes, source, syncedAt }) => ({
      date,
      steps,
      activeCalories,
      activityMinutes,
      source,
      syncedAt,
    })),
    sleepMetrics: trend.map(({ date, sleepHours, source, syncedAt }) => ({
      date,
      sleepHours,
      source,
      syncedAt,
    })),
    syncStatuses: buildSyncStatuses({
      mode: "supabase",
      syncedAt: latest.syncedAt,
      message: "Supabase 연결 및 read-only 조회 성공",
      isConfigured: env.isSupabaseConfigured,
    }),
  };
}
