import { format } from "date-fns";
import { analyzeRecordQuality, summarizeQualityFlags } from "@/services/healthDataQuality";

type RunningSummary = {
  distanceKm?: number;
  durationMinutes?: number;
  avgPace?: number;
  avgHeartRate?: number;
  cadence?: number;
};

type HealthRecord = {
  synced_at: string;
  running_data?: { summary?: RunningSummary };
  sleep_data?: { totalMinutes?: number; deepMinutes?: number };
  nutrition_data?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  body_composition_data?: { weight?: number; bodyFat?: number };
  steps_data?: { count?: number };
};

function paceText(minutesValue?: number) {
  if (!minutesValue) return "-";
  const totalSeconds = Math.round(minutesValue * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function getDaypart(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildAiRecommendation(records: HealthRecord[], now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1];
  const previousDay = sorted[sorted.length - 2];
  const weeklyBase = sorted.slice(-8, -1);

  const latestRun = latest?.running_data?.summary;
  const latestSleep = latest?.sleep_data;
  const latestNutrition = latest?.nutrition_data;
  const latestBody = latest?.body_composition_data;
  const latestSteps = latest?.steps_data;

  if (!latestRun && !latestSleep && !latestNutrition) {
    return "오늘 추천을 만들 데이터가 아직 부족합니다.";
  }

  const qualitySummary = summarizeQualityFlags(analyzeRecordQuality(latest));
  const weeklyDistanceAvg = average(weeklyBase.map((record) => Number(record.running_data?.summary?.distanceKm || 0)).filter((value) => value > 0));
  const weeklySleepAvg = average(weeklyBase.map((record) => Number(record.sleep_data?.totalMinutes || 0)).filter((value) => value > 0));

  const distanceDiff = latestRun && previousDay?.running_data?.summary
    ? Number((Number(latestRun.distanceKm || 0) - Number(previousDay.running_data.summary?.distanceKm || 0)).toFixed(1))
    : 0;
  const weeklyDelta = latestRun ? Number((Number(latestRun.distanceKm || 0) - weeklyDistanceAvg).toFixed(1)) : 0;
  const sleepDebt = latestSleep ? Math.round(420 - Number(latestSleep.totalMinutes || 0)) : 0;
  const proteinLevel = Number(latestNutrition?.protein || 0);
  const bodyFat = Number(latestBody?.bodyFat || 0);
  const steps = Number(latestSteps?.count || 0);
  const daypart = getDaypart(now.getHours());

  if (daypart === "morning") {
    return `오전 추천: 전일 대비 거리 ${distanceDiff >= 0 ? "+" : ""}${distanceDiff}km, 수면 ${latestSleep ? Math.round(Number(latestSleep.totalMinutes || 0)) : 0}분입니다. 오전에는 ${sleepDebt > 0 ? "강도보다 회복 우선" : "가벼운 활성화 러닝"}으로 시작하고 단백질 ${proteinLevel || "-"}g 보충을 챙기세요. ${qualitySummary}`;
  }

  if (daypart === "afternoon") {
    return `오후 추천: 최근 1주 평균 대비 거리 ${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}km, 걸음 수 ${steps.toLocaleString()}걸음입니다. 오후에는 케이던스 ${Math.round(Number(latestRun?.cadence || 0))}spm 유지와 수분 보충, 체지방 ${bodyFat || "-"}% 기준 무리 없는 강도 조절이 좋습니다. ${qualitySummary}`;
  }

  return `저녁 추천: 평균 페이스 ${paceText(latestRun?.avgPace)}, 평균 심박 ${Math.round(Number(latestRun?.avgHeartRate || 0))}bpm, 수면 평균 ${Math.round(weeklySleepAvg)}분 기준입니다. 저녁에는 스트레칭 10분과 회복 식사로 마무리하고 취침 전 강도는 낮추는 편이 좋습니다. ${qualitySummary}`;
}

export function buildAiCoachSummary(records: HealthRecord[], providerLabel: string, now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const latestRun = latest?.running_data?.summary;
  const latestSleep = latest?.sleep_data;
  const latestNutrition = latest?.nutrition_data;
  const latestBody = latest?.body_composition_data;

  if (!latest) {
    return `${providerLabel} 기록 기반 분석을 만들 데이터가 아직 부족합니다.`;
  }

  const latestDate = format(new Date(latest.synced_at), "MM-dd");
  const trendText =
    latestRun && previous?.running_data?.summary
      ? Number(latestRun.avgPace || 0) < Number(previous.running_data.summary?.avgPace || 0)
        ? "전일 대비 페이스가 개선되었습니다."
        : "전일 대비 페이스가 다소 느려졌습니다."
      : "비교할 전일 러닝 데이터가 아직 부족합니다.";

  const sleepText = latestSleep ? `수면 ${Math.round(Number(latestSleep.totalMinutes || 0))}분` : "수면 데이터 없음";
  const nutritionText = latestNutrition ? `단백질 ${latestNutrition.protein || 0}g` : "영양 데이터 없음";
  const bodyText = latestBody ? `체지방 ${latestBody.bodyFat || 0}%` : "체성분 데이터 없음";
  const runText = latestRun
    ? `러닝 ${latestRun.distanceKm || 0}km, ${latestRun.durationMinutes || 0}분, 평균 페이스 ${paceText(latestRun.avgPace)}`
    : "러닝 데이터 없음";
  const qualitySummary = summarizeQualityFlags(analyzeRecordQuality(latest));

  return `${providerLabel} 기준 ${latestDate} 기록은 ${runText}, ${sleepText}, ${nutritionText}, ${bodyText}입니다. ${trendText} 데이터 품질 평가는 ${qualitySummary} 현재 시간대 추천은 ${buildAiRecommendation(records, now)}`;
}
