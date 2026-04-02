import { format } from "date-fns";

type RunningSummary = {
  distanceKm?: number;
  durationMinutes?: number;
  avgPace?: number;
  avgHeartRate?: number;
  cadence?: number;
};

type HealthRecord = {
  synced_at: string;
  running_data?: {
    summary?: RunningSummary;
  };
};

function paceText(minutesValue?: number) {
  if (!minutesValue) {
    return "-";
  }
  const totalSeconds = Math.round(minutesValue * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function getDaypart(hour: number) {
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
}

export function buildAiRecommendation(records: HealthRecord[], now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1]?.running_data?.summary;
  const previousDay = sorted[sorted.length - 2]?.running_data?.summary;
  const weeklyBase = sorted.slice(-8, -1);
  const weeklyAverage =
    weeklyBase.length > 0
      ? weeklyBase.reduce((sum, record) => sum + Number(record.running_data?.summary?.distanceKm || 0), 0) / weeklyBase.length
      : 0;

  if (!latest) {
    return "오늘 추천을 만들 데이터가 아직 부족합니다.";
  }

  const distanceDiff = previousDay ? Number((Number(latest.distanceKm || 0) - Number(previousDay.distanceKm || 0)).toFixed(1)) : 0;
  const paceImproved = previousDay && Number(latest.avgPace || 0) < Number(previousDay.avgPace || 0);
  const weeklyDelta = Number((Number(latest.distanceKm || 0) - weeklyAverage).toFixed(1));
  const hour = now.getHours();
  const daypart = getDaypart(hour);

  if (daypart === "morning") {
    return `오전 추천: 전일 대비 거리 ${distanceDiff >= 0 ? "+" : ""}${distanceDiff}km, 평균 페이스 ${paceText(latest.avgPace)}입니다. 오전에는 무리한 강도보다 가벼운 워밍업과 수분 보충으로 리듬을 맞추세요.`;
  }

  if (daypart === "afternoon") {
    return `오후 추천: 최근 1주 평균 대비 오늘 거리는 ${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta}km입니다. 오후에는 케이던스 ${Math.round(Number(latest.cadence || 0))}spm를 유지하면서 짧은 회복 걷기를 섞는 것이 좋습니다.`;
  }

  return `저녁 추천: ${
    paceImproved ? "전일보다 페이스가 개선됐습니다." : "오늘은 회복 중심 마무리가 좋습니다."
  } 심박 ${Math.round(Number(latest.avgHeartRate || 0))}bpm 수준을 고려해 스트레칭 10분과 가벼운 단백질 보충을 권장합니다.`;
}

export function buildAiCoachSummary(records: HealthRecord[], providerLabel: string, now = new Date()) {
  const sorted = [...records].sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  const latest = sorted[sorted.length - 1]?.running_data?.summary;
  const previous = sorted[sorted.length - 2]?.running_data?.summary;

  if (!latest) {
    return `${providerLabel} 기준 분석을 만들 데이터가 아직 부족합니다.`;
  }

  const latestDate = format(new Date(sorted[sorted.length - 1].synced_at), "MM-dd");
  const trendText =
    previous && Number(latest.avgPace || 0) < Number(previous.avgPace || 0)
      ? "전일 대비 페이스가 개선되었습니다."
      : previous
        ? "전일 대비 페이스가 다소 느려졌습니다."
        : "비교할 전일 데이터가 아직 부족합니다.";

  return `${providerLabel} 기준 ${latestDate} 러닝은 ${latest.distanceKm}km, ${latest.durationMinutes}분, 평균 페이스 ${paceText(
    latest.avgPace,
  )}입니다. ${trendText} 현재 시간대 추천은 ${buildAiRecommendation(records, now)}`;
}
