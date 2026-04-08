import type { AppleHealthDailyPayload } from "@/providers/apple/types/apple";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";

export function mapAppleHealthPayloadToNormalizedHealthData(payload: AppleHealthDailyPayload): NormalizedHealthData {
  const summary = payload.summary || {};
  const workouts = payload.workouts || [];
  const sleep = payload.sleep || [];
  const nutrition = payload.nutrition || [];
  const hydration = payload.hydration || [];

  const nutritionTotals = nutrition.reduce<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(
    (acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.proteinGrams || 0;
      acc.carbs += item.carbsGrams || 0;
      acc.fat += item.fatGrams || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    steps_data: {
      count: summary.steps || 0,
      distance: ((summary.distanceMeters || 0) / 1000).toFixed(2),
      calories: Math.round(summary.activeCalories || 0),
    },
    exercise_data: workouts.map((workout) => ({
      type: workout.name || workout.activityType || "Apple Workout",
      duration: Math.round(workout.durationMinutes || 0),
      calories: Math.round(workout.calories || 0),
      exerciseType: workout.activityType,
      distance: workout.distanceMeters ? Number((workout.distanceMeters / 1000).toFixed(2)) : undefined,
      startTime: workout.startTime,
      endTime: workout.endTime,
      averageHeartRate: workout.averageHeartRate,
      maxHeartRate: workout.maxHeartRate,
      averageSpeed: workout.averageSpeedMetersPerSecond
        ? Number((workout.averageSpeedMetersPerSecond * 3.6).toFixed(1))
        : undefined,
      elevationGainMeters: workout.elevationGainMeters,
      elevationLossMeters: workout.elevationLossMeters,
      averagePaceSecondsPerKilometer: workout.averagePaceSecondsPerKilometer,
    })),
    sleep_data: {
      totalMinutes: Math.round(sleep.reduce((sum, item) => sum + (item.totalMinutes || 0), 0) || summary.sleepMinutes || 0),
      stages: sleep.map((item) => ({
        startTime: item.startTime,
        endTime: item.endTime,
        deepMinutes: item.deepMinutes || 0,
        coreMinutes: item.coreMinutes || 0,
        remMinutes: item.remMinutes || 0,
        awakeMinutes: item.awakeMinutes || 0,
        stages: item.stages || [],
      })),
      score: summary.sleepScore,
      hrvAverage: summary.hrvAverage,
      hrvStatus: summary.hrvStatus,
    },
    body_composition_data: {
      weight: summary.weightKg || 0,
      bodyFat: summary.bodyFatPercent || 0,
      bmi: summary.bmi,
    },
    nutrition_data: {
      calories: Math.round(nutritionTotals.calories),
      nutrition,
      proteinGrams: Number(nutritionTotals.protein.toFixed(1)),
      carbsGrams: Number(nutritionTotals.carbs.toFixed(1)),
      fatGrams: Number(nutritionTotals.fat.toFixed(1)),
    },
    heart_rate: Math.round(summary.averageHeartRate || summary.restingHeartRate || 0),
    resting_heart_rate: summary.restingHeartRate,
    hydration: hydration,
    vo2max: summary.vo2Max ? [{ value: summary.vo2Max }] : [],
    source_metrics: {
      basalCalories: summary.basalCalories || 0,
      hydrationMl: summary.hydrationMl || 0,
      appleWorkouts: workouts.map((workout) => ({
        id: workout.id || "",
        type: workout.activityType || "",
        name: workout.name || "",
        averageRunCadence: workout.averageRunCadence || 0,
        maxRunCadence: workout.maxRunCadence || 0,
        vo2Max: workout.vo2Max || 0,
        temperatureCelsius: workout.temperatureCelsius ?? null,
        routePoints: workout.routePoints || [],
        laps: workout.laps || [],
        timeline: workout.timeline || [],
      })),
      appleSleepStages: sleep.map((item) => ({
        startTime: item.startTime,
        endTime: item.endTime,
        stages: item.stages || [],
      })),
    },
  };
}
