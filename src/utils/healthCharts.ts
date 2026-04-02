import { format, startOfWeek } from "date-fns";
import type { HealthViewMode } from "@/providers/shared/types/provider";

type RunningSummaryRecord = {
  synced_at: string;
  running_data?: {
    summary?: {
      distanceKm?: number;
      durationMinutes?: number;
      avgPace?: number;
      bestPace?: number;
      avgHeartRate?: number;
      maxHeartRate?: number;
      cadence?: number;
      averageSpeed?: number;
      maxSpeed?: number;
      vo2max?: number;
      elevationGain?: number;
      calories?: number;
    };
  };
};

function getBucketKey(date: Date, mode: HealthViewMode) {
  if (mode === "week") {
    return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  if (mode === "month") {
    return format(date, "yyyy-MM");
  }
  if (mode === "year") {
    return format(date, "yyyy");
  }
  return format(date, "yyyy-MM-dd");
}

function getBucketLabel(date: Date, mode: HealthViewMode) {
  if (mode === "week") {
    return `${format(startOfWeek(date, { weekStartsOn: 1 }), "MM/dd")} 주`;
  }
  if (mode === "month") {
    return format(date, "yyyy-MM");
  }
  if (mode === "year") {
    return format(date, "yyyy");
  }
  return format(date, "MM-dd");
}

export function aggregateRunningChartData(records: RunningSummaryRecord[], mode: HealthViewMode) {
  if (mode === "day") {
    return [...records]
      .sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime())
      .map((record) => {
        const summary = record.running_data?.summary || {};
        const syncedAt = new Date(record.synced_at);
        return {
          date: format(syncedAt, "MM-dd"),
          distanceKm: Number(summary.distanceKm || 0),
          durationMinutes: Number(summary.durationMinutes || 0),
          avgPace: Number(summary.avgPace || 0),
          bestPace: Number(summary.bestPace || 0),
          avgHeartRate: Number(summary.avgHeartRate || 0),
          maxHeartRate: Number(summary.maxHeartRate || 0),
          cadence: Number(summary.cadence || 0),
          averageSpeed: Number(summary.averageSpeed || 0),
          maxSpeed: Number(summary.maxSpeed || 0),
          vo2max: Number(summary.vo2max || 0),
          elevationGain: Number(summary.elevationGain || 0),
          calories: Number(summary.calories || 0),
        };
      });
  }

  const grouped = new Map<
    string,
    {
      label: string;
      timestamp: number;
      count: number;
      distanceKm: number;
      durationMinutes: number;
      avgPace: number;
      bestPace: number;
      avgHeartRate: number;
      maxHeartRate: number;
      cadence: number;
      averageSpeed: number;
      maxSpeed: number;
      vo2max: number;
      elevationGain: number;
      calories: number;
    }
  >();

  records.forEach((record) => {
    const date = new Date(record.synced_at);
    const key = getBucketKey(date, mode);
    const summary = record.running_data?.summary || {};
    const current =
      grouped.get(key) ||
      {
        label: getBucketLabel(date, mode),
        timestamp: date.getTime(),
        count: 0,
        distanceKm: 0,
        durationMinutes: 0,
        avgPace: 0,
        bestPace: Number.POSITIVE_INFINITY,
        avgHeartRate: 0,
        maxHeartRate: 0,
        cadence: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        vo2max: 0,
        elevationGain: 0,
        calories: 0,
      };

    current.count += 1;
    current.distanceKm += Number(summary.distanceKm || 0);
    current.durationMinutes += Number(summary.durationMinutes || 0);
    current.avgPace += Number(summary.avgPace || 0);
    current.bestPace = Math.min(current.bestPace, Number(summary.bestPace || current.bestPace));
    current.avgHeartRate += Number(summary.avgHeartRate || 0);
    current.maxHeartRate = Math.max(current.maxHeartRate, Number(summary.maxHeartRate || 0));
    current.cadence += Number(summary.cadence || 0);
    current.averageSpeed += Number(summary.averageSpeed || 0);
    current.maxSpeed = Math.max(current.maxSpeed, Number(summary.maxSpeed || 0));
    current.vo2max += Number(summary.vo2max || 0);
    current.elevationGain += Number(summary.elevationGain || 0);
    current.calories += Number(summary.calories || 0);
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((item) => ({
      date: item.label,
      distanceKm: Number(item.distanceKm.toFixed(2)),
      durationMinutes: Math.round(item.durationMinutes),
      avgPace: Number((item.avgPace / item.count).toFixed(2)),
      bestPace: Number((item.bestPace === Number.POSITIVE_INFINITY ? 0 : item.bestPace).toFixed(2)),
      avgHeartRate: Math.round(item.avgHeartRate / item.count),
      maxHeartRate: Math.round(item.maxHeartRate),
      cadence: Math.round(item.cadence / item.count),
      averageSpeed: Number((item.averageSpeed / item.count).toFixed(1)),
      maxSpeed: Number(item.maxSpeed.toFixed(1)),
      vo2max: Number((item.vo2max / item.count).toFixed(1)),
      elevationGain: Math.round(item.elevationGain),
      calories: Math.round(item.calories),
    }));
}
