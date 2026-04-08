import { addDays, format } from "date-fns";
import { sendAiCoachMessage } from "@/services/openaiClient";
import { getResolvedOpenAiCredentials } from "@/services/security/openAiCredentialStore";

type RunningRecord = {
  synced_at: string;
  running_data?: {
    summary?: {
      distanceKm?: number;
      durationMinutes?: number;
      avgPace?: number;
      bestPace?: number;
      avgHeartRate?: number;
      cadence?: number;
      averageSpeed?: number;
      maxSpeed?: number;
      vo2max?: number;
      elevationGain?: number;
    };
  };
};

export interface ForecastPoint {
  date: string;
  distanceKm: number;
  durationMinutes: number;
  avgPace: number;
  bestPace: number;
  averageSpeed: number;
  maxSpeed: number;
  avgHeartRate: number;
  cadence: number;
  vo2max: number;
  elevationGain: number;
}

export interface ForecastDelta {
  distanceKm: number;
  durationMinutes: number;
  avgPace: number;
  bestPace: number;
  averageSpeed: number;
  maxSpeed: number;
  avgHeartRate: number;
  cadence: number;
  vo2max: number;
  elevationGain: number;
}

function safeNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function getRecentMonthRecords(records: RunningRecord[]) {
  return records
    .filter((record) => {
      const time = new Date(record.synced_at).getTime();
      return Number.isFinite(time) && time >= Date.now() - 1000 * 60 * 60 * 24 * 30;
    })
    .slice(-30);
}

function buildHeuristicForecast(records: RunningRecord[]) {
  const recent = getRecentMonthRecords(records);
  const base = recent.reduce(
    (acc, record) => {
      const summary = record.running_data?.summary || {};
      acc.distanceKm += safeNumber(summary.distanceKm, 0);
      acc.durationMinutes += safeNumber(summary.durationMinutes, 0);
      acc.avgPace += safeNumber(summary.avgPace, 0);
      acc.bestPace += safeNumber(summary.bestPace, 0);
      acc.averageSpeed += safeNumber(summary.averageSpeed, 0);
      acc.maxSpeed += safeNumber(summary.maxSpeed, 0);
      acc.avgHeartRate += safeNumber(summary.avgHeartRate, 0);
      acc.cadence += safeNumber(summary.cadence, 0);
      acc.vo2max += safeNumber(summary.vo2max, 0);
      acc.elevationGain += safeNumber(summary.elevationGain, 0);
      return acc;
    },
    {
      distanceKm: 0,
      durationMinutes: 0,
      avgPace: 0,
      bestPace: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      avgHeartRate: 0,
      cadence: 0,
      vo2max: 0,
      elevationGain: 0,
    },
  );

  const count = Math.max(recent.length, 1);
  const averages = Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, Number((Number(value) / count).toFixed(2))]),
  ) as Record<string, number>;

  return Array.from({ length: 4 }).map((_, index) => ({
    date: format(addDays(new Date(), (index + 1) * 7), "MM-dd"),
    distanceKm: Number((averages.distanceKm * (1 + index * 0.04)).toFixed(2)),
    durationMinutes: Math.round(averages.durationMinutes * (1 + index * 0.03)),
    avgPace: Number(Math.max(averages.avgPace - index * 0.05, 0).toFixed(2)),
    bestPace: Number(Math.max(averages.bestPace - index * 0.04, 0).toFixed(2)),
    averageSpeed: Number((averages.averageSpeed * (1 + index * 0.02)).toFixed(2)),
    maxSpeed: Number((averages.maxSpeed * (1 + index * 0.015)).toFixed(2)),
    avgHeartRate: Math.round(averages.avgHeartRate + index),
    cadence: Math.round(averages.cadence + index * 1.5),
    vo2max: Number((averages.vo2max + index * 0.5).toFixed(1)),
    elevationGain: Math.round(averages.elevationGain * (1 + index * 0.05)),
  }));
}

export function buildForecastDeltas(records: RunningRecord[], point?: ForecastPoint): ForecastDelta {
  const latestSummary = records[records.length - 1]?.running_data?.summary || {};
  const target = point || {
    distanceKm: safeNumber(latestSummary.distanceKm, 0),
    durationMinutes: safeNumber(latestSummary.durationMinutes, 0),
    avgPace: safeNumber(latestSummary.avgPace, 0),
    bestPace: safeNumber(latestSummary.bestPace, 0),
    averageSpeed: safeNumber(latestSummary.averageSpeed, 0),
    maxSpeed: safeNumber(latestSummary.maxSpeed, 0),
    avgHeartRate: safeNumber(latestSummary.avgHeartRate, 0),
    cadence: safeNumber(latestSummary.cadence, 0),
    vo2max: safeNumber(latestSummary.vo2max, 0),
    elevationGain: safeNumber(latestSummary.elevationGain, 0),
    date: "",
  };

  return {
    distanceKm: Number((target.distanceKm - safeNumber(latestSummary.distanceKm, 0)).toFixed(2)),
    durationMinutes: Number((target.durationMinutes - safeNumber(latestSummary.durationMinutes, 0)).toFixed(1)),
    avgPace: Number((target.avgPace - safeNumber(latestSummary.avgPace, 0)).toFixed(2)),
    bestPace: Number((target.bestPace - safeNumber(latestSummary.bestPace, 0)).toFixed(2)),
    averageSpeed: Number((target.averageSpeed - safeNumber(latestSummary.averageSpeed, 0)).toFixed(2)),
    maxSpeed: Number((target.maxSpeed - safeNumber(latestSummary.maxSpeed, 0)).toFixed(2)),
    avgHeartRate: Number((target.avgHeartRate - safeNumber(latestSummary.avgHeartRate, 0)).toFixed(1)),
    cadence: Number((target.cadence - safeNumber(latestSummary.cadence, 0)).toFixed(1)),
    vo2max: Number((target.vo2max - safeNumber(latestSummary.vo2max, 0)).toFixed(1)),
    elevationGain: Number((target.elevationGain - safeNumber(latestSummary.elevationGain, 0)).toFixed(1)),
  };
}

function buildDeltaSummary(points: ForecastPoint[], records: RunningRecord[]) {
  const lastPoint = points[points.length - 1];
  if (!lastPoint) {
    return "예측 데이터를 준비하지 못했습니다.";
  }

  const delta = buildForecastDeltas(records, lastPoint);
  const paceDeltaSeconds = Math.round(delta.avgPace * 60);
  const paceLabel =
    paceDeltaSeconds === 0 ? "변동 없음" : paceDeltaSeconds < 0 ? `${Math.abs(paceDeltaSeconds)}초 단축` : `${paceDeltaSeconds}초 증가`;

  return `최근 한 달 기준 다음 한 달 예측입니다. 거리 ${delta.distanceKm >= 0 ? `+${delta.distanceKm}` : delta.distanceKm}km, 시간 ${
    delta.durationMinutes >= 0 ? `+${delta.durationMinutes}` : delta.durationMinutes
  }분, 평균 페이스 ${paceLabel}, VO2 Max ${delta.vo2max >= 0 ? `+${delta.vo2max}` : delta.vo2max} 변화가 예상됩니다.`;
}

export async function generateRunningForecast(records: RunningRecord[]) {
  const heuristic = buildHeuristicForecast(records);
  const { apiKey } = await getResolvedOpenAiCredentials();
  const recentMonthRecords = getRecentMonthRecords(records);

  if (!apiKey) {
    return {
      points: heuristic,
      summary: buildDeltaSummary(heuristic, recentMonthRecords.length > 0 ? recentMonthRecords : records),
    };
  }

  try {
    const context = JSON.stringify(
      (recentMonthRecords.length > 0 ? recentMonthRecords : records).slice(-30).map((record) => ({
        date: record.synced_at,
        summary: record.running_data?.summary || {},
      })),
    );

    const raw = await sendAiCoachMessage(
      "최근 한 달 러닝 데이터를 기준으로 앞으로 한 달의 주간 예측을 JSON으로만 반환해 주세요.",
      [
        "반드시 JSON만 반환합니다.",
        '{"summary":"증감 요약","points":[{"date":"04-09","distanceKm":0,"durationMinutes":0,"avgPace":0,"bestPace":0,"averageSpeed":0,"maxSpeed":0,"avgHeartRate":0,"cadence":0,"vo2max":0,"elevationGain":0}]}',
        `데이터: ${context}`,
      ].join("\n"),
    );

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.points)) {
      throw new Error("points is not an array");
    }

    const points = parsed.points.map((point: Partial<ForecastPoint>, index: number) => ({
      date: String(point.date || format(addDays(new Date(), (index + 1) * 7), "MM-dd")),
      distanceKm: safeNumber(point.distanceKm, heuristic[index]?.distanceKm || 0),
      durationMinutes: safeNumber(point.durationMinutes, heuristic[index]?.durationMinutes || 0),
      avgPace: safeNumber(point.avgPace, heuristic[index]?.avgPace || 0),
      bestPace: safeNumber(point.bestPace, heuristic[index]?.bestPace || 0),
      averageSpeed: safeNumber(point.averageSpeed, heuristic[index]?.averageSpeed || 0),
      maxSpeed: safeNumber(point.maxSpeed, heuristic[index]?.maxSpeed || 0),
      avgHeartRate: safeNumber(point.avgHeartRate, heuristic[index]?.avgHeartRate || 0),
      cadence: safeNumber(point.cadence, heuristic[index]?.cadence || 0),
      vo2max: safeNumber(point.vo2max, heuristic[index]?.vo2max || 0),
      elevationGain: safeNumber(point.elevationGain, heuristic[index]?.elevationGain || 0),
    }));

    return {
      points,
      summary: String(parsed.summary || buildDeltaSummary(points, recentMonthRecords.length > 0 ? recentMonthRecords : records)),
    };
  } catch (error) {
    console.error("Falling back to heuristic forecast:", error);
    return {
      points: heuristic,
      summary: buildDeltaSummary(heuristic, recentMonthRecords.length > 0 ? recentMonthRecords : records),
    };
  }
}
