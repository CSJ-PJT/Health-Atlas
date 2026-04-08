import type { TodaySnapshot } from "@/providers/samsung/types/healthConnect";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";

export function mapTodaySnapshotToNormalizedHealthData(
  snapshot: TodaySnapshot,
): NormalizedHealthData {
  const avgHeartRate = snapshot.heartRate.length > 0
    ? Math.round(snapshot.heartRate.reduce((sum, hr) => sum + hr.bpm, 0) / snapshot.heartRate.length)
    : 0;

  const latestWeight = snapshot.weight.length > 0
    ? snapshot.weight[snapshot.weight.length - 1].weightKg
    : 0;
  const latestBodyFat = snapshot.bodyFat.length > 0
    ? snapshot.bodyFat[snapshot.bodyFat.length - 1].percentage
    : 0;
  const distanceKm = (snapshot.aggregate.distanceMeter / 1000).toFixed(2);

  const exerciseData = snapshot.exerciseSessions.map((session) => ({
    type: session.title || "운동",
    duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
    calories: session.caloriesKcal,
    exerciseType: session.exerciseType,
  }));

  const totalNutritionCalories = snapshot.nutrition.reduce((sum, nutrition) => sum + nutrition.energyKcal, 0);

  return {
    steps_data: {
      count: snapshot.aggregate.steps,
      distance: distanceKm,
      calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
    },
    exercise_data: exerciseData.length > 0
      ? exerciseData
      : [{
          type: "운동",
          duration: snapshot.aggregate.exerciseDurationMinutes,
          calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
        }],
    sleep_data: {
      totalMinutes: snapshot.aggregate.sleepDurationMinutes,
      stages: snapshot.sleepStageSummary,
    },
    body_composition_data: {
      weight: latestWeight,
      bodyFat: latestBodyFat,
    },
    nutrition_data: {
      calories: Math.round(totalNutritionCalories),
      nutrition: snapshot.nutrition,
      proteinGrams: Number(snapshot.nutrition.reduce((sum, item) => sum + (item.proteinGrams || 0), 0).toFixed(1)),
      carbsGrams: Number(snapshot.nutrition.reduce((sum, item) => sum + (item.carbsGrams || 0), 0).toFixed(1)),
      fatGrams: Number(snapshot.nutrition.reduce((sum, item) => sum + (item.fatGrams || 0), 0).toFixed(1)),
    },
    heart_rate: avgHeartRate,
    hydration: snapshot.hydration,
    vo2max: snapshot.vo2max,
    source_metrics: {
      exerciseDurationMinutes: snapshot.aggregate.exerciseDurationMinutes,
      sleepDurationMinutes: snapshot.aggregate.sleepDurationMinutes,
    },
  };
}
