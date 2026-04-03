import type { StravaDailyPayload } from "@/providers/strava/types/strava";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";

export function mapStravaPayloadToNormalizedHealthData(payload: StravaDailyPayload): NormalizedHealthData {
  const summary = payload.summary || {};
  const activities = payload.activities || [];

  return {
    steps_data: {
      count: summary.steps || 0,
      distance: ((summary.distanceMeters || 0) / 1000).toFixed(2),
      calories: Math.round(summary.activeCalories || 0),
      movingMinutes: Math.round(activities.reduce((sum, item) => sum + ((item.moving_time || 0) / 60), 0)),
    },
    exercise_data: activities.map((activity) => ({
      type: activity.name || activity.type || "Strava Activity",
      duration: Math.round((activity.moving_time || activity.elapsed_time || 0) / 60),
      calories: Math.round(activity.calories || 0),
      exerciseType: activity.type,
      distance: Number(((activity.distance || 0) / 1000).toFixed(2)),
      startTime: activity.start_date,
      averageHeartRate: activity.average_heartrate,
      maxHeartRate: activity.max_heartrate,
      averageSpeed: activity.average_speed ? Number((activity.average_speed * 3.6).toFixed(1)) : undefined,
      maxSpeed: activity.max_speed ? Number((activity.max_speed * 3.6).toFixed(1)) : undefined,
      elevationGainMeters: activity.total_elevation_gain,
    })),
    sleep_data: {
      totalMinutes: 0,
    },
    body_composition_data: {
      weight: payload.athlete?.weight || summary.weightKg || 0,
      bodyFat: 0,
    },
    nutrition_data: {
      calories: 0,
      nutrition: [],
    },
    heart_rate: Math.round(summary.averageHeartRate || 0),
    resting_heart_rate: summary.restingHeartRate,
    hydration: [],
    vo2max: summary.vo2Max ? [{ value: summary.vo2Max }] : [],
    source_metrics: {
      recentRunTotals: payload.stats?.recent_run_totals || null,
      allRunTotals: payload.stats?.all_run_totals || null,
      elevationGain: summary.elevationGain || 0,
    },
  };
}
