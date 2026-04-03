import type { AppleHealthDailyPayload, AppleHealthProviderConfig } from "@/providers/apple/types/apple";

function buildUrl(baseUrl: string, path: string, date: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBaseUrl}${path}`);
  url.searchParams.set("date", date);
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJson<T>(config: AppleHealthProviderConfig, path: string, date: string) {
  if (!config.apiBaseUrl || !config.accessToken) {
    throw new Error("Apple Health backend bridge 설정이 필요합니다.");
  }

  const response = await fetchWithTimeout(buildUrl(config.apiBaseUrl, path, date), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
      "X-Apple-App-Id": config.appId,
      "X-Apple-Team-Id": config.teamId,
    },
  });

  if (!response.ok) {
    throw new Error(`Apple Health API 요청 실패 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function fetchWorkoutDetails(config: AppleHealthProviderConfig, date: string, workoutIds: string[]) {
  const details = await Promise.all(
    workoutIds.map(async (workoutId) => {
      try {
        const detail = await fetchJson<Record<string, unknown>>(config, `/apple-health/workouts/${workoutId}`, date);
        return { workoutId, detail };
      } catch {
        return null;
      }
    }),
  );

  return details.filter(Boolean) as Array<{ workoutId: string; detail: Record<string, unknown> }>;
}

export async function fetchAppleHealthDailyPayload(
  config: AppleHealthProviderConfig,
  date: string,
): Promise<AppleHealthDailyPayload> {
  const [summary, workouts, sleep, nutrition, hydration] = await Promise.all([
    fetchJson(config, "/apple-health/daily-summary", date),
    fetchJson(config, "/apple-health/workouts", date),
    fetchJson(config, "/apple-health/sleep", date),
    fetchJson(config, "/apple-health/nutrition", date),
    fetchJson(config, "/apple-health/hydration", date),
  ]);

  const normalizedWorkouts = Array.isArray(workouts) ? workouts : [];
  const workoutIds = normalizedWorkouts.map((workout) => workout?.id).filter((value): value is string => typeof value === "string" && value.length > 0);
  const details = workoutIds.length > 0 ? await fetchWorkoutDetails(config, date, workoutIds) : [];
  const detailedWorkouts = normalizedWorkouts.map((workout) => {
    const detail = details.find((item) => item.workoutId === workout.id)?.detail;
    return detail ? { ...workout, ...detail } : workout;
  });

  return {
    summary,
    workouts: detailedWorkouts,
    sleep: Array.isArray(sleep) ? sleep : [],
    nutrition: Array.isArray(nutrition) ? nutrition : [],
    hydration: Array.isArray(hydration) ? hydration : [],
  };
}
