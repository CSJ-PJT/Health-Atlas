import { addDays, format } from "date-fns";
import { sendAiCoachMessage } from "@/services/openaiClient";

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

function safeNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function buildHeuristicForecast(records: RunningRecord[]) {
  const recent = records.slice(-6);
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

function buildDeltaSummary(points: ForecastPoint[], records: RunningRecord[]) {
  const latestSummary = records[records.length - 1]?.running_data?.summary || {};
  const lastPoint = points[points.length - 1];
  if (!lastPoint) {
    return "예측 데이터를 준비하지 못했습니다.";
  }

  const distanceDelta = Number((lastPoint.distanceKm - safeNumber(latestSummary.distanceKm, lastPoint.distanceKm)).toFixed(2));
  const durationDelta = Math.round(lastPoint.durationMinutes - safeNumber(latestSummary.durationMinutes, lastPoint.durationMinutes));
  const paceDeltaSeconds = Math.round((lastPoint.avgPace - safeNumber(latestSummary.avgPace, lastPoint.avgPace)) * 60);
  const vo2Delta = Number((lastPoint.vo2max - safeNumber(latestSummary.vo2max, lastPoint.vo2max)).toFixed(1));

  const paceLabel =
    paceDeltaSeconds === 0 ? "변동 없음" : paceDeltaSeconds < 0 ? `${Math.abs(paceDeltaSeconds)}초 단축` : `${paceDeltaSeconds}초 증가`;

  return `현재 대비 한 달 뒤 예상 변화는 거리 ${distanceDelta >= 0 ? `+${distanceDelta}` : distanceDelta}km, 시간 ${
    durationDelta >= 0 ? `+${durationDelta}` : durationDelta
  }분, 평균 페이스 ${paceLabel}, VO2 Max ${vo2Delta >= 0 ? `+${vo2Delta}` : vo2Delta}입니다.`;
}

export async function generateRunningForecast(records: RunningRecord[]) {
  const heuristic = buildHeuristicForecast(records);
  const apiKey = localStorage.getItem("openai_api_key");

  if (!apiKey) {
    return {
      points: heuristic,
      summary: buildDeltaSummary(heuristic, records),
    };
  }

  try {
    const context = JSON.stringify(
      records.slice(-10).map((record) => ({
        date: record.synced_at,
        summary: record.running_data?.summary || {},
      })),
    );

    const raw = await sendAiCoachMessage(
      "최근 러닝 데이터를 기반으로 앞으로 4주 예측을 JSON으로만 반환해줘.",
      [
        "반드시 JSON만 반환합니다.",
        '형식: {"summary":"증감 요약","points":[{"date":"04-09","distanceKm":0,"durationMinutes":0,"avgPace":0,"bestPace":0,"averageSpeed":0,"maxSpeed":0,"avgHeartRate":0,"cadence":0,"vo2max":0,"elevationGain":0}]}',
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
      summary: String(parsed.summary || buildDeltaSummary(points, records)),
    };
  } catch (error) {
    console.error("Falling back to heuristic forecast:", error);
    return {
      points: heuristic,
      summary: buildDeltaSummary(heuristic, records),
    };
  }
}
