type RunningSummary = {
  distanceKm?: number;
  durationMinutes?: number;
  avgPace?: number;
  avgHeartRate?: number;
  cadence?: number;
  averageSpeed?: number;
  maxSpeed?: number;
};

type SleepSummary = {
  totalMinutes?: number;
};

type NutritionSummary = {
  calories?: number;
  protein?: number;
};

type StepsSummary = {
  count?: number;
};

export type QualityFlag = {
  key:
    | "speed_outlier"
    | "distance_outlier"
    | "heart_rate_missing"
    | "heart_rate_outlier"
    | "sleep_outlier"
    | "nutrition_missing"
    | "steps_outlier";
  severity: "info" | "warn";
  message: string;
};

export type QualityRecord = {
  running_data?: { summary?: RunningSummary };
  sleep_data?: SleepSummary;
  nutrition_data?: NutritionSummary;
  steps_data?: StepsSummary;
};

function asNumber(value: unknown, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function analyzeRecordQuality(record: QualityRecord | null | undefined) {
  if (!record) return [] as QualityFlag[];

  const flags: QualityFlag[] = [];
  const run = record.running_data?.summary;
  const sleep = record.sleep_data;
  const nutrition = record.nutrition_data;
  const steps = record.steps_data;

  if (run) {
    const distance = asNumber(run.distanceKm);
    const duration = asNumber(run.durationMinutes);
    const avgHeartRate = asNumber(run.avgHeartRate);
    const averageSpeed = asNumber(run.averageSpeed);
    const maxSpeed = asNumber(run.maxSpeed);

    if (distance > 120 || duration > 900) {
      flags.push({
        key: "distance_outlier",
        severity: "warn",
        message: "러닝 거리나 운동 시간이 비정상적으로 커서 자동 기록 오류일 가능성이 있습니다.",
      });
    }

    if (averageSpeed > 25 || maxSpeed > 40) {
      flags.push({
        key: "speed_outlier",
        severity: "warn",
        message: "평균 또는 최고 속도가 비정상적으로 높아 차량 이동이 섞였을 가능성이 있습니다.",
      });
    }

    if (!avgHeartRate) {
      flags.push({
        key: "heart_rate_missing",
        severity: "info",
        message: "심박 데이터가 비어 있어 운동 강도 분석 정확도가 낮아질 수 있습니다.",
      });
    } else if (avgHeartRate < 45 || avgHeartRate > 205) {
      flags.push({
        key: "heart_rate_outlier",
        severity: "warn",
        message: "평균 심박이 비정상 범위로 감지되어 센서 오류 가능성이 있습니다.",
      });
    }

    if (distance > 0 && duration > 0 && run.avgPace && run.avgPace < 2.2) {
      flags.push({
        key: "speed_outlier",
        severity: "warn",
        message: "평균 페이스가 비정상적으로 빨라 GPS 또는 기록 오류 가능성이 있습니다.",
      });
    }
  }

  if (sleep && asNumber(sleep.totalMinutes) > 960) {
    flags.push({
      key: "sleep_outlier",
      severity: "info",
      message: "수면 시간이 과도하게 길게 기록되어 수면 병합 오류 여부를 확인할 필요가 있습니다.",
    });
  }

  if (!asNumber(nutrition?.calories) && !asNumber(nutrition?.protein)) {
    flags.push({
      key: "nutrition_missing",
      severity: "info",
      message: "영양 데이터가 비어 있어 회복과 섭취 분석이 제한됩니다.",
    });
  }

  if (asNumber(steps?.count) > 70000) {
    flags.push({
      key: "steps_outlier",
      severity: "warn",
      message: "걸음 수가 매우 커서 중복 수집 여부를 확인하는 것이 좋습니다.",
    });
  }

  return flags;
}

export function summarizeQualityFlags(flags: QualityFlag[]) {
  if (flags.length === 0) {
    return "데이터 이상치는 크게 감지되지 않았습니다.";
  }
  return flags.map((flag) => flag.message).join(" ");
}
