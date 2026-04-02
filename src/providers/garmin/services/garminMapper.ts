import type { GarminDailyPayload } from "@/providers/garmin/types/garmin";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";

export function mapGarminPayloadToNormalizedHealthData(payload: GarminDailyPayload): NormalizedHealthData {
  const summary = payload.summary || {};
  const activities = payload.activities || [];
  const sleepSessions = payload.sleep || [];
  const nutrition = payload.nutrition || [];
  const hydration = payload.hydration || [];

  const totalNutritionCalories = nutrition.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalHydrationLiters = hydration.reduce((sum, item) => sum + ((item.milliliters || 0) / 1000), 0);

  return {
    steps_data: {
      count: summary.steps || 0,
      distance: ((summary.distanceMeters || 0) / 1000).toFixed(2),
      calories: Math.round(summary.activeCalories || 0),
    },
    exercise_data: activities.length > 0
      ? activities.map((activity) => ({
          type: activity.name || activity.type || "Garmin Activity",
          duration: Math.round(activity.durationMinutes || 0),
          calories: Math.round(activity.calories || 0),
          exerciseType: activity.type,
          distance: activity.distanceMeters ? Number((activity.distanceMeters / 1000).toFixed(2)) : undefined,
        }))
      : [{
          type: "Garmin Activity",
          duration: 0,
          calories: 0,
        }],
    sleep_data: {
      totalMinutes: Math.round(
        sleepSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0) || summary.sleepMinutes || 0,
      ),
      stages: sleepSessions.map((session) => ({
        startTime: session.startTime,
        endTime: session.endTime,
        deepMinutes: session.deepMinutes || 0,
        lightMinutes: session.lightMinutes || 0,
        remMinutes: session.remMinutes || 0,
        awakeMinutes: session.awakeMinutes || 0,
      })),
    },
    body_composition_data: {
      weight: summary.weightKg || 0,
      bodyFat: summary.bodyFatPercent || 0,
    },
    nutrition_data: {
      calories: Math.round(totalNutritionCalories || summary.caloriesConsumed || 0),
      nutrition,
    },
    heart_rate: Math.round(summary.averageHeartRate || summary.restingHeartRate || 0),
    hydration: totalHydrationLiters > 0 ? [{ totalLiters: totalHydrationLiters, entries: hydration }] : [],
    vo2max: summary.vo2Max ? [{ value: summary.vo2Max }] : [],
  };
}
