import type { GarminDailyPayload, GarminProviderConfig } from "@/providers/garmin/types/garmin";
import { asArray, asObject } from "@/providers/shared/services/providerPayloadGuards";

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

async function fetchActivityDetails(config: GarminProviderConfig, date: string, activityIds: string[]) {
  const details = await Promise.all(
    activityIds.map(async (activityId) => {
      try {
        const detail = await fetchJson<Record<string, unknown>>(config, `/garmin/activities/${activityId}`, date);
        return { activityId, detail };
      } catch {
        return null;
      }
    }),
  );

  return details.filter(Boolean) as Array<{ activityId: string; detail: Record<string, unknown> }>;
}

export async function fetchGarminDailyPayload(config: GarminProviderConfig, date: string): Promise<GarminDailyPayload> {
  const [summary, activities, sleep, nutrition, hydration] = await Promise.all([
    fetchJson(config, "/garmin/daily-summary", date),
    fetchJson(config, "/garmin/activities", date),
    fetchJson(config, "/garmin/sleep", date),
    fetchJson(config, "/garmin/nutrition", date),
    fetchJson(config, "/garmin/hydration", date),
  ]);

  const normalizedActivities = asArray<Record<string, unknown>>(activities).map((activity) => asObject(activity));
  const activityIds = normalizedActivities.map((activity) => activity?.id).filter((value): value is string => typeof value === "string" && value.length > 0);
  const details = activityIds.length > 0 ? await fetchActivityDetails(config, date, activityIds) : [];
  const detailedActivities = normalizedActivities.map((activity) => {
    const detail = details.find((item) => item.activityId === activity.id)?.detail;
    return detail ? { ...activity, ...detail } : activity;
  });

  return {
    summary: asObject(summary),
    activities: detailedActivities,
    sleep: asArray<Record<string, unknown>>(sleep).map((item) => asObject(item)),
    nutrition: asArray<Record<string, unknown>>(nutrition).map((item) => asObject(item)),
    hydration: asArray<Record<string, unknown>>(hydration).map((item) => asObject(item)),
  };
}
