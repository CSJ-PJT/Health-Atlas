import { supabase } from "@/integrations/supabase/client";
import { getDefaultRangeForMode, getMockHealthHistory } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthViewMode, NormalizedHealthData, ProviderId } from "@/providers/shared/types/provider";

function getStartBoundary(date?: Date) {
  if (!date) {
    return undefined;
  }

  const boundary = new Date(date);
  boundary.setHours(0, 0, 0, 0);
  return boundary;
}

function getEndBoundary(date?: Date) {
  if (!date) {
    return undefined;
  }

  const boundary = new Date(date);
  boundary.setHours(23, 59, 59, 999);
  return boundary;
}

function resolveDateRange(mode: HealthViewMode, from?: Date, to?: Date) {
  const defaults = getDefaultRangeForMode(mode);
  return {
    startBoundary: getStartBoundary(from || defaults.start),
    endBoundary: getEndBoundary(to || defaults.end),
  };
}

function filterMockRecords(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const allRecords = getMockHealthHistory();

  const filtered = allRecords.filter((record) => {
    const syncedAt = new Date(record.synced_at).getTime();
    if (startBoundary && syncedAt < startBoundary.getTime()) {
      return false;
    }
    if (endBoundary && syncedAt > endBoundary.getTime()) {
      return false;
    }
    return true;
  });

  if (filtered.length > 0) {
    return filtered;
  }

  if (mode === "day") {
    return allRecords.slice(-1);
  }
  if (mode === "week") {
    return allRecords.slice(-7);
  }
  if (mode === "month") {
    return allRecords.slice(-30);
  }
  return allRecords.slice(-365);
}

export async function fetchHealthHistory(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const mockRecords = filterMockRecords(mode, from, to);

  if (isMockHealthDataEnabled()) {
    return mockRecords.sort(
      (left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime(),
    );
  }

  let query = supabase.from("health_data").select("*").order("synced_at", { ascending: false }).limit(400);

  if (startBoundary) {
    query = query.gte("synced_at", startBoundary.toISOString());
  }
  if (endBoundary) {
    query = query.lte("synced_at", endBoundary.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Falling back to mock history data:", error);
    return mockRecords.sort((left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime());
  }

  if (!data || data.length === 0) {
    return mockRecords.sort((left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime());
  }

  return data;
}

export async function fetchHealthStats(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const mockRecords = filterMockRecords(mode, from, to);

  if (isMockHealthDataEnabled()) {
    return mockRecords.sort(
      (left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime(),
    );
  }

  let query = supabase
    .from("health_data")
    .select("synced_at, exercise_data, body_composition_data, nutrition_data, running_data, sleep_data, steps_data")
    .order("synced_at", { ascending: true });

  if (startBoundary) {
    query = query.gte("synced_at", startBoundary.toISOString());
  }
  if (endBoundary) {
    query = query.lte("synced_at", endBoundary.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Falling back to mock stats data:", error);
    return mockRecords.sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  }

  if (!data || data.length === 0) {
    return mockRecords.sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  }

  return data;
}

function buildRunningData(normalized: NormalizedHealthData, providerId: ProviderId) {
  const safeStepDistance = Number(normalized.steps_data?.distance);
  const totalExerciseSeconds = (normalized.exercise_data ?? []).reduce((sum, entry) => sum + Math.max(0, Number(entry.duration) || 0), 0);
  const stepsData = (normalized.steps_data ?? {}) as Record<string, unknown>;
  const pickNumeric = (keys: string[]) => {
    for (const key of keys) {
      const value = stepsData[key];
      if (value === undefined || value === null) {
        continue;
      }
      if (typeof value === "number" || typeof value === "string") {
        const num = Number(value);
        if (Number.isFinite(num)) {
          return num;
        }
      }
    }
    return null;
  };

  return {
    providerId,
    summary: {
      steps: pickNumeric(["count", "steps"]),
      distanceMeters: Number.isFinite(safeStepDistance) ? safeStepDistance : null,
      calories: pickNumeric(["calories", "activeCalories"]),
      distanceKm: Number.isFinite(safeStepDistance) ? safeStepDistance / 1000 : null,
      durationMinutes: totalExerciseSeconds > 0 ? Math.round(totalExerciseSeconds / 60) : null,
      activeMinutes: pickNumeric(["movingMinutes", "durationMinutes", "activity_minutes"]),
      restingHeartRate: normalized.resting_heart_rate ?? normalized.heart_rate ?? null,
    },
    exerciseSessions: (normalized.exercise_data ?? []).map((entry, index) => ({
      index,
        title: entry.type || "activity",
        durationMinutes: Number(entry.duration) || null,
        calories: Number(entry.calories) || null,
        distanceMeters: Number(entry.distance) || null,
        averageHeartRate: entry.averageHeartRate,
        maxHeartRate: entry.maxHeartRate,
        averageSpeed: entry.averageSpeed,
      avgPace: entry.averagePaceSecondsPerKilometer,
      exerciseType: entry.exerciseType ?? entry.type,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })),
    sleepSession:
      normalized.sleep_data && Number.isFinite(Number(normalized.sleep_data.totalMinutes))
        ? {
            totalMinutes: normalized.sleep_data.totalMinutes,
            score: normalized.sleep_data.score,
          }
        : null,
    bodySnapshot: {
      weightKg: normalized.body_composition_data?.weight ?? null,
      bodyFat: normalized.body_composition_data?.bodyFat ?? null,
      bmi: normalized.body_composition_data?.bmi ?? null,
    },
    nutrition: {
      calories: normalized.nutrition_data?.calories ?? null,
      proteinGrams: normalized.nutrition_data?.proteinGrams ?? null,
      carbsGrams: normalized.nutrition_data?.carbsGrams ?? null,
      fatGrams: normalized.nutrition_data?.fatGrams ?? null,
      items: normalized.nutrition_data?.nutrition ?? null,
    },
  };
}

export async function saveHealthSnapshot(
  normalized: NormalizedHealthData,
  providerId: ProviderId,
  syncedAt = new Date().toISOString(),
) {
  const { data: authSession, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !authSession?.session) {
    throw new Error("AUTH_REQUIRED");
  }

  const running_data = buildRunningData(normalized, providerId);

  const payload = {
    healthData: {
      syncedAt,
      steps: normalized.steps_data,
      exercise: normalized.exercise_data,
      running: running_data,
      sleep: normalized.sleep_data,
      bodyComposition: normalized.body_composition_data,
      nutrition: normalized.nutrition_data,
    },
  };

  const { data, error } = await supabase.functions.invoke("send-health-data", {
    body: payload,
  });

  if (error) {
    console.error("Failed to save health snapshot via function:", error);
    return false;
  }

  return data?.success === true;
}
