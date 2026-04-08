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

function collectTrendValues(records: HealthRecord[]) {
  const recent = records.slice(-7);
  return {
    runningDistanceAvg: average(
      recent.map((record) => Number(record.running_data?.summary?.distanceKm || 0)).filter((value) => value > 0),
    ),
    sleepAvg: average(
      recent.map((record) => Number(record.sleep_data?.totalMinutes || 0)).filter((value) => value > 0),
    ),
    proteinAvg: average(
      recent.map((record) => Number(record.nutrition_data?.protein || 0)).filter((value) => value > 0),
    ),
    stepsAvg: average(recent.map((record) => Number(record.steps_data?.count || 0)).filter((value) => value > 0)),
    bodyFatAvg: average(
      recent.map((record) => Number(record.body_composition_data?.bodyFat || 0)).filter((value) => value > 0),
    ),
  };
}

function buildRecoverySignal(record?: HealthRecord) {
  const sleepMinutes = Number(record?.sleep_data?.totalMinutes || 0);
  const deepMinutes = Number(record?.sleep_data?.deepMinutes || 0);
  const protein = Number(record?.nutrition_data?.protein || 0);
  const calories = Number(record?.nutrition_data?.calories || 0);

  if (!sleepMinutes && !protein && !calories) {
    return "회복 데이터가 아직 충분하지 않습니다.";
  }

  const sleepText =
    sleepMinutes >= 420
      ? `수면 ${sleepMinutes}분으로 기본 회복량은 확보했습니다`
      : `수면 ${sleepMinutes}분으로 회복이 부족할 수 있습니다`;
  const deepText = deepMinutes > 0 ? `깊은 수면 ${deepMinutes}분` : "깊은 수면 데이터는 비어 있습니다";
  const proteinText = protein > 0 ? `단백질 ${protein}g` : "단백질 기록은 비어 있습니다";
  const calorieText = calories > 0 ? `섭취 열량 ${calories}kcal` : "열량 기록은 비어 있습니다";

  return `${sleepText}. ${deepText}, ${proteinText}, ${calorieText}.`;
}

function buildBodySignal(record?: HealthRecord) {
  const weight = Number(record?.body_composition_data?.weight || 0);
  const bodyFat = Number(record?.body_composition_data?.bodyFat || 0);
  const steps = Number(record?.steps_data?.count || 0);

  const bodyText = weight > 0 ? `체중 ${weight.toFixed(1)}kg` : "체중 데이터 없음";
  const fatText = bodyFat > 0 ? `체지방 ${bodyFat.toFixed(1)}%` : "체지방 데이터 없음";
  const stepText = steps > 0 ? `걸음 수 ${steps.toLocaleString()}보` : "걸음 수 데이터 없음";

  return `${bodyText}, ${fatText}, ${stepText}`;
}

export function buildAiRecommendation(records: HealthRecord[], now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1];
  const previousDay = sorted[sorted.length - 2];
  const trends = collectTrendValues(sorted);

  const latestRun = latest?.running_data?.summary;
  const latestSleep = latest?.sleep_data;
  const latestNutrition = latest?.nutrition_data;
  const latestBody = latest?.body_composition_data;
  const latestSteps = latest?.steps_data;

  if (!latestRun && !latestSleep && !latestNutrition && !latestBody && !latestSteps) {
    return "오늘 추천을 만들기 위한 데이터가 아직 충분하지 않습니다.";
  }

  const qualitySummary = summarizeQualityFlags(analyzeRecordQuality(latest));
  const distanceDiff =
    latestRun && previousDay?.running_data?.summary
      ? Number((Number(latestRun.distanceKm || 0) - Number(previousDay.running_data.summary?.distanceKm || 0)).toFixed(1))
      : 0;
  const weeklyDelta = latestRun ? Number((Number(latestRun.distanceKm || 0) - trends.runningDistanceAvg).toFixed(1)) : 0;
  const sleepDebt = latestSleep ? Math.round(420 - Number(latestSleep.totalMinutes || 0)) : 0;
  const proteinLevel = Number(latestNutrition?.protein || 0);
  const bodyFat = Number(latestBody?.bodyFat || 0);
  const steps = Number(latestSteps?.count || 0);
  const daypart = getDaypart(now.getHours());

  if (daypart === "morning") {
    return `오전 추천: 전일 대비 거리 변화는 ${distanceDiff >= 0 ? "+" : ""}${distanceDiff}km입니다. ${
      sleepDebt > 0 ? "오늘은 강한 훈련보다 회복 우선 흐름이 맞습니다." : "오늘은 가벼운 활성화 러닝이나 워킹으로 시작해도 좋습니다."
    } 단백질 ${proteinLevel || 0}g, 걸음 수 ${steps.toLocaleString()}보, 체지방 ${bodyFat || 0}% 기준으로 보면 수분 보충과 아침 식사 균형을 먼저 챙기는 편이 좋습니다. ${qualitySummary}`;
  }

  if (daypart === "afternoon") {
    return `오후 추천: 최근 1주 평균 대비 거리 변화는 ${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}km이고, 현재 걸음 수는 ${steps.toLocaleString()}보입니다. 오후에는 케이던스 ${Math.round(
      Number(latestRun?.cadence || 0),
    )}spm 전후의 무리 없는 지속 훈련이나 파워 워킹이 적절합니다. 수면 평균 ${Math.round(trends.sleepAvg)}분, 단백질 평균 ${Math.round(
      trends.proteinAvg,
    )}g 기준으로 회복이 부족하면 강도는 한 단계 낮추는 편이 안전합니다. ${qualitySummary}`;
  }

  return `저녁 추천: 평균 페이스 ${paceText(latestRun?.avgPace)}, 평균 심박 ${Math.round(
    Number(latestRun?.avgHeartRate || 0),
  )}bpm, 최근 수면 평균 ${Math.round(trends.sleepAvg)}분 기준입니다. 저녁에는 스트레칭 10분과 가벼운 회복 루틴으로 마무리하고, 걸음 수 ${steps.toLocaleString()}보와 체지방 ${
    bodyFat || 0
  }% 추세를 함께 보면서 다음 훈련 강도를 조절하는 편이 좋습니다. ${qualitySummary}`;
}

export function buildAiCoachSummary(records: HealthRecord[], providerLabel: string, now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const latestRun = latest?.running_data?.summary;
  const latestSleep = latest?.sleep_data;
  const latestNutrition = latest?.nutrition_data;
  const latestBody = latest?.body_composition_data;
  const trends = collectTrendValues(sorted);

  if (!latest) {
    return `${providerLabel} 기록 기반 분석을 만들 데이터가 아직 충분하지 않습니다.`;
  }

  const latestDate = format(new Date(latest.synced_at), "MM-dd");
  const trendText =
    latestRun && previous?.running_data?.summary
      ? Number(latestRun.avgPace || 0) < Number(previous.running_data.summary?.avgPace || 0)
        ? "전일 대비 페이스가 개선됐습니다."
        : "전일 대비 페이스가 다소 느려졌습니다."
      : "직전 비교 데이터가 부족해 추세 해석은 제한적입니다.";

  const runText = latestRun
    ? `러닝 ${latestRun.distanceKm || 0}km, ${latestRun.durationMinutes || 0}분, 평균 페이스 ${paceText(latestRun.avgPace)}`
    : "러닝 데이터 없음";
  const sleepText = latestSleep
    ? `수면 ${Math.round(Number(latestSleep.totalMinutes || 0))}분, 최근 평균 ${Math.round(trends.sleepAvg)}분`
    : "수면 데이터 없음";
  const nutritionText = latestNutrition
    ? `단백질 ${latestNutrition.protein || 0}g, 최근 평균 ${Math.round(trends.proteinAvg)}g`
    : "영양 데이터 없음";
  const bodyText = latestBody
    ? `체지방 ${latestBody.bodyFat || 0}%, 최근 평균 ${trends.bodyFatAvg ? trends.bodyFatAvg.toFixed(1) : "-"}%`
    : "체성분 데이터 없음";
  const recoveryText = buildRecoverySignal(latest);
  const bodySignal = buildBodySignal(latest);
  const qualitySummary = summarizeQualityFlags(analyzeRecordQuality(latest));

  return `${providerLabel} 기준 ${latestDate} 기록 요약입니다. ${runText}. ${sleepText}. ${nutritionText}. ${bodyText}. ${trendText} ${recoveryText} 현재 상태는 ${bodySignal} 기준으로 해석했습니다. 데이터 품질 점검 결과: ${qualitySummary} 현재 시간대 추천은 ${buildAiRecommendation(
    records,
    now,
  )}`;
}
