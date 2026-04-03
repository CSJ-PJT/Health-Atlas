import type {
  StravaActivity,
  StravaAthleteProfile,
  StravaAthleteStats,
  StravaDailyPayload,
  StravaProviderConfig,
  StravaTokenResponse,
} from "@/providers/strava/types/strava";
import { setStravaAuthExpiresAt } from "@/providers/strava/services/stravaConfigStore";
import { setSecret } from "@/services/security/secretStorage";

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function refreshStravaAccessToken(config: StravaProviderConfig) {
  const response = await fetchWithTimeout("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava 토큰 갱신 실패 (${response.status})`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}

async function fetchStravaJson<T>(accessToken: string, path: string, query?: Record<string, string>) {
  const url = new URL(`https://www.strava.com/api/v3${path}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Strava API 요청 실패 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function fetchStravaDailyPayload(config: StravaProviderConfig, date: string): Promise<StravaDailyPayload> {
  const token = await refreshStravaAccessToken(config);
  setSecret("strava_access_token", token.access_token);
  setSecret("strava_refresh_token", token.refresh_token);
  setStravaAuthExpiresAt(token.expires_at);

  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${date}T23:59:59Z`);

  const [activities, athlete, stats] = await Promise.all([
    fetchStravaJson<StravaActivity[]>(token.access_token, "/athlete/activities", {
      after: `${Math.floor(start.getTime() / 1000)}`,
      before: `${Math.floor(end.getTime() / 1000)}`,
      page: "1",
      per_page: "30",
    }),
    fetchStravaJson<StravaAthleteProfile>(token.access_token, "/athlete"),
    fetchStravaJson<StravaAthleteStats>(token.access_token, `/athletes/${config.athleteId}/stats`),
  ]);

  const distanceMeters = (activities || []).reduce((sum, item) => sum + (item.distance || 0), 0);
  const activeCalories = (activities || []).reduce((sum, item) => sum + (item.calories || 0), 0);
  const heartRateSamples = (activities || [])
    .map((item) => item.average_heartrate || 0)
    .filter((value) => value > 0);
  const averageHeartRate =
    heartRateSamples.length > 0
      ? Math.round(heartRateSamples.reduce((sum, value) => sum + value, 0) / heartRateSamples.length)
      : 0;
  const vo2Max = activities.some((item) => item.suffer_score)
    ? Number((40 + (activities.reduce((sum, item) => sum + (item.suffer_score || 0), 0) / Math.max(activities.length, 1)) / 10).toFixed(1))
    : undefined;

  return {
    summary: {
      steps: Math.round(distanceMeters / 0.78),
      distanceMeters,
      activeCalories,
      averageHeartRate,
      weightKg: athlete?.weight,
      vo2Max,
      elevationGain: (activities || []).reduce((sum, item) => sum + (item.total_elevation_gain || 0), 0),
    },
    activities: activities || [],
    athlete: athlete || null,
    stats: stats || null,
  };
}
