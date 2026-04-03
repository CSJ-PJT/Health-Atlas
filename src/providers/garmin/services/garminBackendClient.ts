import type { GarminDailyPayload, GarminProviderConfig } from "@/providers/garmin/types/garmin";

function buildUrl(baseUrl: string, path: string, date: string, userId: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBaseUrl}${path}`);
  url.searchParams.set("date", date);
  url.searchParams.set("userId", userId);
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

async function fetchJson<T>(config: GarminProviderConfig, path: string, date: string) {
  const response = await fetchWithTimeout(buildUrl(config.apiBaseUrl, path, date, config.userId), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Garmin API 요청 실패 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function fetchGarminDailyPayload(config: GarminProviderConfig, date: string): Promise<GarminDailyPayload> {
  const [summary, activities, sleep, nutrition, hydration] = await Promise.all([
    fetchJson(config, "/garmin/daily-summary", date),
    fetchJson(config, "/garmin/activities", date),
    fetchJson(config, "/garmin/sleep", date),
    fetchJson(config, "/garmin/nutrition", date),
    fetchJson(config, "/garmin/hydration", date),
  ]);

  return {
    summary,
    activities: Array.isArray(activities) ? activities : [],
    sleep: Array.isArray(sleep) ? sleep : [],
    nutrition: Array.isArray(nutrition) ? nutrition : [],
    hydration: Array.isArray(hydration) ? hydration : [],
  };
}
