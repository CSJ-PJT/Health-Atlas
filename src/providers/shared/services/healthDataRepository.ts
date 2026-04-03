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

function formatPaceFromSpeed(speedKmh?: number) {
  if (!speedKmh || speedKmh <= 0) {
    return 0;
  }
  return Number((3600 / speedKmh).toFixed(2));
}

function buildRunningData(normalized: NormalizedHealthData, providerId: ProviderId) {
  const stravaActivityMetrics = Array.isArray(normalized.source_metrics?.stravaActivities)
    ? (normalized.source_metrics?.stravaActivities as Array<{
        id: number;
        averageCadence?: number;
        averageTemp?: number;
        splitsMetric?: Array<{
          split?: number;
          distance?: number;
          moving_time?: number;
          average_heartrate?: number;
        }>;
        streamSet?: {
          time?: { data: number[] };
          distance?: { data: number[] };
          heartrate?: { data: number[] };
          velocity_smooth?: { data: number[] };
        } | null;
        sufferScore?: number;
      }>)
    : [];

  const runningExercises = normalized.exercise_data.filter((exercise) => {
    const combined = `${exercise.type} ${exercise.exerciseType || ""}`.toLowerCase();
    return combined.includes("run") || combined.includes("running");
  });

  const sessions = runningExercises.map((exercise, index) => {
    const activityId = `${providerId}-session-${Date.now()}-${index}`;
    const stravaMetric = stravaActivityMetrics[index];
    const durationSeconds = Math.round((exercise.duration || 0) * 60);
    const distanceKm = Number(exercise.distance || 0);
    const averageSpeed = Number(exercise.averageSpeed || 0);
    const averagePace = Number(exercise.averagePaceSecondsPerKilometer || formatPaceFromSpeed(averageSpeed));
    const maxSpeed = Number(exercise.maxSpeed || averageSpeed);
    const maxPace = maxSpeed > 0 ? formatPaceFromSpeed(maxSpeed) : averagePace;
    const lapDistanceKm = distanceKm > 0 ? Math.max(Math.floor(distanceKm), 1) : 1;

    return {
      activityId,
      activityName: exercise.type || `${providerId} workout`,
      activityType: String(exercise.exerciseType || exercise.type || providerId),
      durationSeconds,
      distanceMeters: Math.round(distanceKm * 1000),
      averagePaceSecondsPerKilometer: averagePace,
      bestPaceSecondsPerKilometer: maxPace || averagePace,
      averageSpeedMetersPerSecond: averageSpeed > 0 ? Number((averageSpeed / 3.6).toFixed(3)) : 0,
      maxSpeedMetersPerSecond: maxSpeed > 0 ? Number((maxSpeed / 3.6).toFixed(3)) : 0,
      averageHR: exercise.averageHeartRate || normalized.heart_rate || 0,
      maxHR: exercise.maxHeartRate || exercise.averageHeartRate || normalized.heart_rate || 0,
      averageRunCadence: Math.round(Number(stravaMetric?.averageCadence || 0)),
      maxRunCadence: Math.round(Number(stravaMetric?.averageCadence || 0)),
      elevationGainMeters: exercise.elevationGainMeters || 0,
      elevationLossMeters: exercise.elevationLossMeters || 0,
      vo2Max: Array.isArray(normalized.vo2max) ? Number((normalized.vo2max[0] as { value?: number } | undefined)?.value || 0) : 0,
      calories: exercise.calories || 0,
      temperatureCelsius: stravaMetric?.averageTemp ?? null,
      trainingEffectLabel: "Measured",
      trainingEffectAerobic: 0,
      trainingEffectAnaerobic: 0,
      trainingLoad: Number(stravaMetric?.sufferScore || 0),
      estimatedSweatLossMl: 0,
      averageStrideLengthMeters: 0,
      steps: durationSeconds > 0 ? normalized.steps_data.count : 0,
      startTime: exercise.startTime || null,
      endTime: exercise.endTime || null,
      lapDistanceKm,
      sourceTimeline: stravaMetric?.streamSet || null,
      sourceSplits: stravaMetric?.splitsMetric || [],
    };
  });

  const summary = sessions.reduce(
    (acc, session) => {
      acc.distanceKm += session.distanceMeters / 1000;
      acc.durationMinutes += session.durationSeconds / 60;
      acc.avgHeartRate += session.averageHR;
      acc.cadence += session.averageRunCadence;
      acc.averageSpeed += session.averageSpeedMetersPerSecond * 3.6;
      acc.maxSpeed = Math.max(acc.maxSpeed, session.maxSpeedMetersPerSecond * 3.6);
      acc.bestPace = acc.bestPace === 0 ? session.bestPaceSecondsPerKilometer / 60 : Math.min(acc.bestPace, session.bestPaceSecondsPerKilometer / 60);
      acc.elevationGain += session.elevationGainMeters;
      acc.elevationLoss += session.elevationLossMeters;
      acc.calories += session.calories;
      return acc;
    },
    {
      distanceKm: 0,
      durationMinutes: 0,
      avgHeartRate: 0,
      cadence: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      bestPace: 0,
      elevationGain: 0,
      elevationLoss: 0,
      calories: 0,
    },
  );

  const count = Math.max(sessions.length, 1);
  const summaryShape = {
    distanceKm: Number(summary.distanceKm.toFixed(2)),
    durationMinutes: Math.round(summary.durationMinutes),
    avgPace:
      summary.distanceKm > 0 && summary.durationMinutes > 0
        ? Number((summary.durationMinutes / summary.distanceKm).toFixed(2))
        : 0,
    bestPace: Number(summary.bestPace.toFixed(2)),
    averageSpeed: Number((summary.averageSpeed / count).toFixed(1)),
    maxSpeed: Number(summary.maxSpeed.toFixed(1)),
    avgHeartRate: Math.round(summary.avgHeartRate / count),
    cadence: Math.round(summary.cadence / count),
    vo2max: Array.isArray(normalized.vo2max) ? Number((normalized.vo2max[0] as { value?: number } | undefined)?.value || 0) : 0,
    elevationGain: Math.round(summary.elevationGain),
    elevationLoss: Math.round(summary.elevationLoss),
    calories: Math.round(summary.calories),
  };

  const session_timelines = Object.fromEntries(
    sessions.map((session) => [
      session.activityId,
      session.sourceTimeline?.time?.data?.length
        ? session.sourceTimeline.time.data.map((time, index) => {
            const distanceMeters = Number(session.sourceTimeline?.distance?.data?.[index] || 0);
            const velocity = Number(session.sourceTimeline?.velocity_smooth?.data?.[index] || 0);
            return {
              label: `${index + 1}`,
              minute: Math.round(time / 60),
              time: `${Math.floor(time / 60)}:${String(Math.round(time % 60)).padStart(2, "0")}`,
              distanceKm: Number((distanceMeters / 1000).toFixed(2)),
              heartRate: Number(session.sourceTimeline?.heartrate?.data?.[index] || session.averageHR),
              pace: velocity > 0 ? Number((1000 / velocity / 60).toFixed(2)) : session.averagePaceSecondsPerKilometer / 60,
            };
          })
        : [
            {
              label: "start",
              minute: 0,
              time: "0:00",
              distanceKm: 0,
              heartRate: session.averageHR,
              pace: session.averagePaceSecondsPerKilometer / 60,
            },
            {
              label: "finish",
              minute: Math.round(session.durationSeconds / 60),
              time: `${Math.floor(session.durationSeconds / 60)}:00`,
              distanceKm: Number((session.distanceMeters / 1000).toFixed(2)),
              heartRate: session.maxHR,
              pace: session.bestPaceSecondsPerKilometer / 60,
            },
          ],
    ]),
  );

  const session_laps = Object.fromEntries(
    sessions.map((session) => [
      session.activityId,
      session.sourceSplits.length > 0
        ? session.sourceSplits.map((split, index) => ({
            lap: split.split || index + 1,
            distanceKm: Number((((split.distance || 0) as number) / 1000 || 1).toFixed(2)),
            durationMinutes: Number((((split.moving_time || 0) as number) / 60).toFixed(2)),
            averageHeartRate: Number(split.average_heartrate || session.averageHR),
          }))
        : Array.from({ length: session.lapDistanceKm }).map((_, index) => ({
            lap: index + 1,
            distanceKm: 1,
            durationMinutes: Number((summaryShape.avgPace || 0).toFixed(2)),
            averageHeartRate: session.averageHR,
          })),
    ]),
  );

  return {
    sessions,
    summary: summaryShape,
    hourly_series: [],
    session_timelines,
    session_laps,
  };
}

export async function saveHealthSnapshot(
  normalized: NormalizedHealthData,
  providerId: ProviderId,
  syncedAt = new Date().toISOString(),
) {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    return false;
  }

  const running_data = buildRunningData(normalized, providerId);

  const payload = {
    user_id: userId,
    synced_at: syncedAt,
    steps_data: normalized.steps_data,
    exercise_data: normalized.exercise_data,
    running_data,
    sleep_data: normalized.sleep_data,
    body_composition_data: normalized.body_composition_data,
    nutrition_data: normalized.nutrition_data,
  };

  const { error } = await supabase.from("health_data").insert(payload);
  if (error) {
    console.error("Failed to save health snapshot:", error);
    return false;
  }

  return true;
}
