import type { StravaProviderConfig } from "@/providers/strava/types/strava";
import { getSecret, setSecret } from "@/services/security/secretStorage";

const STRAVA_CLIENT_ID_KEY = "strava_client_id";
const STRAVA_CLIENT_SECRET_KEY = "strava_client_secret";
const STRAVA_REFRESH_TOKEN_KEY = "strava_refresh_token";
const STRAVA_ATHLETE_ID_KEY = "strava_athlete_id";
const STRAVA_AUTH_EXPIRES_AT_KEY = "strava_auth_expires_at";

export function getStravaProviderConfig(): StravaProviderConfig {
  return {
    clientId: localStorage.getItem(STRAVA_CLIENT_ID_KEY)?.trim() || "",
    clientSecret: getSecret(STRAVA_CLIENT_SECRET_KEY),
    refreshToken: getSecret(STRAVA_REFRESH_TOKEN_KEY),
    athleteId: localStorage.getItem(STRAVA_ATHLETE_ID_KEY)?.trim() || "",
  };
}

export function setStravaProviderConfig(config: StravaProviderConfig) {
  localStorage.setItem(STRAVA_CLIENT_ID_KEY, config.clientId.trim());
  setSecret(STRAVA_CLIENT_SECRET_KEY, config.clientSecret.trim());
  setSecret(STRAVA_REFRESH_TOKEN_KEY, config.refreshToken.trim());
  localStorage.setItem(STRAVA_ATHLETE_ID_KEY, config.athleteId.trim());
}

export function hasStravaProviderConfig() {
  const config = getStravaProviderConfig();
  return Boolean(config.clientId && config.clientSecret && config.refreshToken && config.athleteId);
}

export function setStravaAuthExpiresAt(expiresAt: number | string) {
  localStorage.setItem(STRAVA_AUTH_EXPIRES_AT_KEY, String(expiresAt));
}

export function getStravaAuthExpiresAt() {
  return localStorage.getItem(STRAVA_AUTH_EXPIRES_AT_KEY);
}
