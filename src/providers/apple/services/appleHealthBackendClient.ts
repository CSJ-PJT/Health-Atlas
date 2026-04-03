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

  return {
    summary,
    workouts: Array.isArray(workouts) ? workouts : [],
    sleep: Array.isArray(sleep) ? sleep : [],
    nutrition: Array.isArray(nutrition) ? nutrition : [],
    hydration: Array.isArray(hydration) ? hydration : [],
  };
}
