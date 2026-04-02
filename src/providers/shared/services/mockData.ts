import type { GarminDailyPayload } from "@/providers/garmin/types/garmin";
import { mapGarminPayloadToNormalizedHealthData } from "@/providers/garmin/services/garminMapper";
import type { TodaySnapshot } from "@/providers/samsung/types/healthConnect";
import { mapTodaySnapshotToNormalizedHealthData } from "@/providers/samsung/services/samsungMapper";
import { getProviderMeta } from "@/providers/shared/services/providerMeta";
import { getStoredProviderId } from "@/providers/shared/services/providerStorage";
import type { HealthViewMode, ProviderId } from "@/providers/shared/types/provider";

function toIso(date: Date) {
  return date.toISOString();
}

function formatTime(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getProviderBase(providerId: ProviderId) {
  const meta = getProviderMeta(providerId);

  const baseByProvider: Record<
    ProviderId,
    { steps: number; distanceMeters: number; weight: number; bodyFat: number; vo2Max: number }
  > = {
    samsung: { steps: 12864, distanceMeters: 9420, weight: 71.6, bodyFat: 18.4, vo2Max: 47.8 },
    garmin: { steps: 15420, distanceMeters: 11320, weight: 69.8, bodyFat: 16.9, vo2Max: 51 },
    "apple-health": { steps: 13640, distanceMeters: 10180, weight: 68.4, bodyFat: 17.6, vo2Max: 49.2 },
    strava: { steps: 11980, distanceMeters: 12460, weight: 70.1, bodyFat: 15.8, vo2Max: 52.4 },
  };

  return {
    meta,
    ...baseByProvider[providerId],
  };
}

function buildRoutePoints(seed: number) {
  return Array.from({ length: 10 }, (_, index) => ({
    lat: 37.5665 + seed * 0.00035 + index * 0.00045,
    lng: 126.978 + seed * 0.00025 + Math.sin(index / 2) * 0.0016,
  }));
}

function buildHourlySeries(
  date: Date,
  summary: {
    distanceKm: number;
    durationMinutes: number;
    avgPace: number;
    bestPace: number;
    averageSpeed: number;
    maxSpeed: number;
    avgHeartRate: number;
    cadence: number;
    elevationGain: number;
  },
) {
  return Array.from({ length: 24 }, (_, hour) => {
    const active = hour >= 6 && hour <= 22;
    const ramp = hour < 6 ? 0 : hour < 12 ? (hour - 5) / 7 : hour < 18 ? (18 - hour) / 6 : 0.3;
    const multiplier = active ? Math.max(0, ramp) : 0;

    return {
      time: `${hour.toString().padStart(2, "0")}:00`,
      distanceKm: Number((summary.distanceKm * multiplier).toFixed(2)),
      durationMinutes: Math.round(summary.durationMinutes * multiplier),
      avgPace: Number((summary.avgPace + (multiplier > 0 ? Math.sin(hour) * 0.08 : 0)).toFixed(2)),
      bestPace: Number((summary.bestPace + (multiplier > 0 ? Math.cos(hour) * 0.04 : 0)).toFixed(2)),
      averageSpeed: Number((summary.averageSpeed * multiplier).toFixed(1)),
      maxSpeed: Number((summary.maxSpeed * multiplier).toFixed(1)),
      avgHeartRate: Math.round(summary.avgHeartRate * multiplier),
      cadence: Math.round(summary.cadence * multiplier),
      elevationGain: Math.round(summary.elevationGain * multiplier),
      at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).toISOString(),
    };
  });
}

function buildSessionTimeline(session: {
  startTimeLocal: string;
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSecondsPerKilometer: number;
  bestPaceSecondsPerKilometer: number;
  averageSpeedMetersPerSecond: number;
  maxSpeedMetersPerSecond: number;
  averageHR: number;
  maxHR: number;
  averageRunCadence: number;
  maxRunCadence: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  vo2Max: number;
  calories: number;
}) {
  const start = new Date(session.startTimeLocal);
  const checkpoints = 6;

  return Array.from({ length: checkpoints + 1 }, (_, index) => {
    const progress = index / checkpoints;
    const minutes = Math.round((session.durationSeconds / 60) * progress);
    const pointTime = new Date(start.getTime() + minutes * 60 * 1000);

    return {
      time: formatTime(pointTime),
      distanceKm: Number(((session.distanceMeters / 1000) * progress).toFixed(2)),
      durationMinutes: minutes,
      avgPace: Number((session.averagePaceSecondsPerKilometer / 60 + Math.sin(index) * 0.05).toFixed(2)),
      bestPace: Number((session.bestPaceSecondsPerKilometer / 60 + Math.cos(index) * 0.03).toFixed(2)),
      averageSpeed: Number(session.averageSpeedMetersPerSecond * 3.6).toFixed(1),
      maxSpeed: Number(session.maxSpeedMetersPerSecond * 3.6).toFixed(1),
      avgHeartRate: Math.round(session.averageHR * Math.max(progress, 0.18)),
      maxHeartRate: Math.round(session.maxHR * Math.max(progress, 0.15)),
      cadence: Math.round(session.averageRunCadence * Math.max(progress, 0.18)),
      maxCadence: Math.round(session.maxRunCadence * Math.max(progress, 0.15)),
      elevationGain: Math.round(session.elevationGainMeters * progress),
      elevationLoss: Math.round(session.elevationLossMeters * progress),
      vo2Max: session.vo2Max,
      calories: Math.round(session.calories * progress),
    };
  });
}

function buildSessionLaps(session: {
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKilometer: number;
  averageHR: number;
  averageRunCadence: number;
}) {
  return Array.from({ length: 4 }, (_, index) => {
    const paceMinutes = session.averagePaceSecondsPerKilometer / 60 + (index - 1.5) * 0.08;
    const minutes = Math.floor(paceMinutes);
    const seconds = Math.round((paceMinutes - minutes) * 60);

    return {
      lapNumber: index + 1,
      distanceKm: Number(((session.distanceMeters / 1000) / 4).toFixed(2)),
      duration: `${Math.round((session.durationSeconds / 60) / 4)}분`,
      pace: `${minutes}:${seconds.toString().padStart(2, "0")} /km`,
      avgHeartRate: session.averageHR + index * 2,
      cadence: session.averageRunCadence + index,
    };
  });
}

export function getMockSamsungTodaySnapshot(): TodaySnapshot {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return {
    aggregate: {
      steps: 12864,
      distanceMeter: 9420,
      activeCaloriesKcal: 684,
      exerciseDurationMinutes: 78,
      sleepDurationMinutes: 422,
    },
    heartRate: [
      { bpm: 61, time: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 6)) },
      { bpm: 88, time: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 2)) },
      { bpm: 104, time: toIso(new Date(now.getTime() - 1000 * 60 * 35)) },
    ],
    exerciseSessions: [
      {
        title: "Outdoor Run",
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 95)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 45)),
        exerciseType: 33,
        caloriesKcal: 412,
        distanceMeter: 7100,
        durationMinutes: 50,
      },
      {
        title: "Walking",
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 30)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 2)),
        exerciseType: 79,
        caloriesKcal: 154,
        distanceMeter: 2320,
        durationMinutes: 28,
      },
    ],
    sleepSessions: [
      {
        title: "Night Sleep",
        startTime: toIso(new Date(startOfDay.getTime() - 1000 * 60 * 60 * 7)),
        endTime: toIso(new Date(startOfDay.getTime() - 1000 * 60 * 60)),
        notes: null,
        durationMinutes: 422,
      },
    ],
    sleepStageSummary: {
      deepMinutes: 96,
      lightMinutes: 214,
      remMinutes: 88,
      awakeMinutes: 24,
    },
    weight: [{ time: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 12)), weightKg: 71.6 }],
    bodyFat: [{ time: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 12)), percentage: 18.4 }],
    vo2max: [{ time: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 24)), vo2mlPerKgMin: 47.8 }],
    hydration: [
      {
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 5)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 5 + 1000 * 60)),
        volumeLiters: 0.5,
      },
      {
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 + 1000 * 60)),
        volumeLiters: 0.7,
      },
    ],
    nutrition: [
      {
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 8)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 8 + 1000 * 60 * 20)),
        mealType: 1,
        name: "Breakfast Bowl",
        energyKcal: 540,
        proteinGrams: 28,
        fatGrams: 14,
        carbsGrams: 72,
      },
      {
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 3)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 3 + 1000 * 60 * 25)),
        mealType: 3,
        name: "Lunch Pasta",
        energyKcal: 760,
        proteinGrams: 32,
        fatGrams: 22,
        carbsGrams: 101,
      },
    ],
  };
}

export function getMockGarminDailyPayload(): GarminDailyPayload {
  const now = new Date();

  return {
    summary: {
      steps: 15420,
      distanceMeters: 11320,
      activeCalories: 812,
      restingCalories: 1634,
      sleepMinutes: 438,
      restingHeartRate: 54,
      averageHeartRate: 83,
      weightKg: 69.8,
      bodyFatPercent: 16.9,
      hydrationMl: 2350,
      vo2Max: 51,
      caloriesConsumed: 2280,
    },
    activities: [
      {
        id: "garmin-activity-001",
        name: "Morning Run",
        type: "running",
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 7)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 6 - 1000 * 60 * 12)),
        durationMinutes: 48,
        distanceMeters: 8650,
        calories: 536,
        averageHeartRate: 149,
      },
      {
        id: "garmin-activity-002",
        name: "Evening Walk",
        type: "walking",
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 90)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 48)),
        durationMinutes: 42,
        distanceMeters: 2670,
        calories: 168,
        averageHeartRate: 102,
      },
    ],
    sleep: [
      {
        startTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 15)),
        endTime: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 8 - 1000 * 60 * 42)),
        totalMinutes: 438,
        deepMinutes: 82,
        lightMinutes: 218,
        remMinutes: 104,
        awakeMinutes: 34,
      },
    ],
    nutrition: [
      {
        mealName: "Greek Yogurt",
        consumedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 9)),
        calories: 320,
        proteinGrams: 22,
        fatGrams: 9,
        carbsGrams: 36,
      },
      {
        mealName: "Chicken Rice Bowl",
        consumedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 4)),
        calories: 840,
        proteinGrams: 44,
        fatGrams: 18,
        carbsGrams: 108,
      },
    ],
    hydration: [
      { consumedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 10)), milliliters: 700 },
      { consumedAt: toIso(new Date(now.getTime() - 1000 * 60 * 60 * 2)), milliliters: 900 },
    ],
  };
}

export function getMockNormalizedHealthData(providerId = getStoredProviderId()) {
  if (providerId === "samsung") {
    return mapTodaySnapshotToNormalizedHealthData(getMockSamsungTodaySnapshot());
  }

  const garminLikeData = mapGarminPayloadToNormalizedHealthData(getMockGarminDailyPayload());
  const base = getProviderBase(providerId);

  return {
    ...garminLikeData,
    steps_data: {
      count: base.steps,
      distance: (base.distanceMeters / 1000).toFixed(2),
      calories: Math.round(base.steps * 0.052),
    },
    body_composition_data: {
      weight: base.weight,
      bodyFat: base.bodyFat,
    },
    vo2max: [{ value: base.vo2Max }],
    exercise_data: garminLikeData.exercise_data.map((exercise, index) => ({
      ...exercise,
      type:
        index === 0
          ? providerId === "strava"
            ? "Strava Run"
            : `${base.meta.shortLabel} Run`
          : providerId === "apple-health"
            ? "Recovery Walk"
            : exercise.type,
    })),
  };
}

export function getMockHealthHistory(providerId = getStoredProviderId()) {
  const today = getMockNormalizedHealthData(providerId);
  const base = getProviderBase(providerId);
  const primaryExercise = today.exercise_data[0];

  return Array.from({ length: 400 }, (_, index) => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() - index);

    const weeklyWave = Math.sin(index / 3) * 0.08;
    const monthlyWave = Math.cos(index / 9) * 0.06;
    const factor = Math.max(0.72, 1 - index * 0.0012 + weeklyWave + monthlyWave);
    const distanceKm = Number(((primaryExercise?.distance || 8.4) * factor).toFixed(2));
    const durationMinutes = Math.max(28, Math.round((primaryExercise?.duration || 48) * factor));
    const avgPace = Number((durationMinutes / Math.max(distanceKm, 1)).toFixed(2));
    const bestPace = Number(Math.max(4.18, avgPace - 0.55).toFixed(2));
    const worstPace = Number((avgPace + 0.63).toFixed(2));
    const averageSpeed = Number((60 / avgPace).toFixed(1));
    const maxSpeed = Number((averageSpeed + 5.1).toFixed(1));
    const steps = Math.round(base.steps * factor);
    const calories = Math.round((primaryExercise?.calories || 520) * factor);
    const avgHeartRate = Math.max(118, Math.round(148 - index * 0.03 + weeklyWave * 20));
    const maxHeartRate = Math.max(avgHeartRate + 12, Math.round(173 - index * 0.02));
    const cadence = Math.max(158, Math.round(174 - index * 0.02));
    const maxCadence = cadence + 8;
    const elevationGain = Math.max(18, Math.round(84 + Math.sin(index / 6) * 30));
    const elevationLoss = Math.max(16, Math.round(elevationGain * 0.9));
    const sessionIdPrefix = providerId.replace(/[^a-z]/g, "");
    const runName = providerId === "strava" ? "Morning Tempo" : `${base.meta.shortLabel} Run`;
    const secondName =
      providerId === "garmin" ? "Recovery Walk" : providerId === "apple-health" ? "Evening Walk" : "Light Walk";

    const runningSession = {
      activityId: `${sessionIdPrefix}-run-${index + 1}`,
      activityName: runName,
      activityType: "running",
      startTimeLocal: date.toISOString(),
      durationSeconds: durationMinutes * 60,
      distanceMeters: Math.round(distanceKm * 1000),
      averagePaceSecondsPerKilometer: Math.round(avgPace * 60),
      bestPaceSecondsPerKilometer: Math.round(bestPace * 60),
      averageSpeedMetersPerSecond: Number((averageSpeed / 3.6).toFixed(2)),
      maxSpeedMetersPerSecond: Number((maxSpeed / 3.6).toFixed(2)),
      averageHR: avgHeartRate,
      maxHR: maxHeartRate,
      averageRunCadence: cadence,
      maxRunCadence: maxCadence,
      averageStrideLengthMeters: Number((1.08 + Math.sin(index / 8) * 0.04).toFixed(2)),
      elevationGainMeters: elevationGain,
      elevationLossMeters: elevationLoss,
      vo2Max: Number((base.vo2Max - index * 0.01).toFixed(1)),
      trainingEffectAerobic: Number((3.2 + Math.sin(index / 7) * 0.4).toFixed(1)),
      trainingEffectAnaerobic: Number((1.3 + Math.cos(index / 6) * 0.3).toFixed(1)),
      trainingEffectLabel: "기본 효과",
      trainingLoad: Math.round(68 + Math.sin(index / 5) * 14),
      estimatedSweatLossMl: Math.round(640 + Math.sin(index / 4) * 90),
      steps: Math.round(distanceKm * 1320),
      recoveryHours: Math.round(12 + Math.sin(index / 3) * 3),
      bodyBatteryImpact: Math.round(-18 - Math.sin(index / 5) * 4),
      calories,
      routePoints: buildRoutePoints(index + providerId.length),
    };

    const recoverySession = {
      ...runningSession,
      activityId: `${sessionIdPrefix}-walk-${index + 1}`,
      activityName: secondName,
      activityType: "walking",
      durationSeconds: 1800,
      distanceMeters: 2200,
      averagePaceSecondsPerKilometer: 540,
      bestPaceSecondsPerKilometer: 500,
      averageSpeedMetersPerSecond: 1.9,
      maxSpeedMetersPerSecond: 2.5,
      averageHR: 108,
      maxHR: 122,
      averageRunCadence: 112,
      maxRunCadence: 118,
      averageStrideLengthMeters: 0.82,
      elevationGainMeters: 18,
      elevationLossMeters: 16,
      calories: 132,
      routePoints: buildRoutePoints(index + providerId.length + 20),
    };

    const summary = {
      avgPace,
      bestPace,
      worstPace,
      avgHeartRate,
      maxHeartRate,
      minHeartRate: Math.max(96, avgHeartRate - 26),
      cadence,
      averageSpeed,
      maxSpeed,
      vo2max: Number((base.vo2Max - index * 0.01).toFixed(1)),
      elevationGain,
      elevationLoss,
      distanceKm,
      durationMinutes,
      calories,
      trainingEffectAerobic: runningSession.trainingEffectAerobic,
      trainingEffectAnaerobic: runningSession.trainingEffectAnaerobic,
      trainingLoad: runningSession.trainingLoad,
      estimatedSweatLossMl: runningSession.estimatedSweatLossMl,
      recoveryHours: runningSession.recoveryHours,
      bodyBatteryImpact: runningSession.bodyBatteryImpact,
    };

    return {
      id: `mock-${providerId}-${index + 1}`,
      synced_at: date.toISOString(),
      steps_data: {
        count: steps,
        distance: distanceKm.toFixed(2),
        calories: Math.round(steps * 0.053),
      },
      exercise_data: [
        {
          type: runName,
          duration: durationMinutes,
          calories,
          distance: distanceKm,
        },
        {
          type: secondName,
          duration: Math.round(durationMinutes * 0.48),
          calories: Math.round(calories * 0.32),
          distance: Number((distanceKm * 0.34).toFixed(2)),
        },
      ],
      running_data: {
        sessions: [runningSession, recoverySession],
        summary,
        hourly_series: buildHourlySeries(date, summary),
        session_timelines: {
          [runningSession.activityId]: buildSessionTimeline(runningSession),
          [recoverySession.activityId]: buildSessionTimeline(recoverySession),
        },
        session_laps: {
          [runningSession.activityId]: buildSessionLaps(runningSession),
          [recoverySession.activityId]: buildSessionLaps(recoverySession),
        },
      },
      sleep_data: {
        duration: `${Math.floor((420 + (index % 4) * 16) / 60)}시간 ${(420 + (index % 4) * 16) % 60}분`,
        deep_sleep: `1시간 ${28 + (index % 5)}분`,
        light_sleep: `3시간 ${18 + (index % 4)}분`,
        rem_sleep: `1시간 ${14 + (index % 3)}분`,
      },
      body_composition_data: {
        weight: Number((base.weight + Math.sin(index / 11) * 0.8).toFixed(1)),
        bodyFat: Number((base.bodyFat + Math.cos(index / 13) * 0.5).toFixed(1)),
        muscleMass: Number((32.4 - index * 0.01).toFixed(1)),
        bodyFatMass: Number((12.3 + index * 0.01).toFixed(1)),
      },
      nutrition_data: {
        calories: Math.round(2150 + Math.sin(index / 5) * 180),
        protein: `${Math.round(128 + Math.sin(index / 8) * 10)}g`,
        carbs: `${Math.round(242 + Math.cos(index / 6) * 16)}g`,
        fat: `${Math.round(58 + Math.sin(index / 7) * 6)}g`,
      },
    };
  }).reverse();
}

export function getDefaultRangeForMode(mode: HealthViewMode, anchorDate = new Date()) {
  const end = new Date(anchorDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);

  if (mode === "week") {
    start.setDate(anchorDate.getDate() - 6);
  } else if (mode === "month") {
    start.setMonth(anchorDate.getMonth() - 1);
    start.setDate(anchorDate.getDate() + 1);
  } else if (mode === "year") {
    start.setFullYear(anchorDate.getFullYear() - 1);
    start.setDate(anchorDate.getDate() + 1);
  }

  return { start, end };
}
