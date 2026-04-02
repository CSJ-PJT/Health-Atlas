import type { StravaProviderConfig } from "@/providers/strava/types/strava";

const STRAVA_CLIENT_ID_KEY = "strava_client_id";
const STRAVA_CLIENT_SECRET_KEY = "strava_client_secret";
const STRAVA_REFRESH_TOKEN_KEY = "strava_refresh_token";
const STRAVA_ATHLETE_ID_KEY = "strava_athlete_id";

export function getStravaProviderConfig(): StravaProviderConfig {
  return {
    clientId: localStorage.getItem(STRAVA_CLIENT_ID_KEY)?.trim() || "",
    clientSecret: localStorage.getItem(STRAVA_CLIENT_SECRET_KEY)?.trim() || "",
    refreshToken: localStorage.getItem(STRAVA_REFRESH_TOKEN_KEY)?.trim() || "",
    athleteId: localStorage.getItem(STRAVA_ATHLETE_ID_KEY)?.trim() || "",
  };
}

export function setStravaProviderConfig(config: StravaProviderConfig) {
  localStorage.setItem(STRAVA_CLIENT_ID_KEY, config.clientId.trim());
  localStorage.setItem(STRAVA_CLIENT_SECRET_KEY, config.clientSecret.trim());
  localStorage.setItem(STRAVA_REFRESH_TOKEN_KEY, config.refreshToken.trim());
  localStorage.setItem(STRAVA_ATHLETE_ID_KEY, config.athleteId.trim());
}

export function hasStravaProviderConfig() {
  const config = getStravaProviderConfig();
  return Boolean(config.clientId && config.clientSecret && config.refreshToken && config.athleteId);
}
