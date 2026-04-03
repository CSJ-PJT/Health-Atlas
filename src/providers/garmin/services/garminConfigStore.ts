import type { GarminProviderConfig } from "@/providers/garmin/types/garmin";
import { getSecret, setSecret } from "@/services/security/secretStorage";

const GARMIN_API_BASE_URL_KEY = "garmin_api_base_url";
const GARMIN_ACCESS_TOKEN_KEY = "garmin_access_token";
const GARMIN_USER_ID_KEY = "garmin_user_id";

export function getGarminProviderConfig(): GarminProviderConfig {
  return {
    apiBaseUrl: localStorage.getItem(GARMIN_API_BASE_URL_KEY)?.trim() || "",
    accessToken: getSecret(GARMIN_ACCESS_TOKEN_KEY),
    userId: localStorage.getItem(GARMIN_USER_ID_KEY)?.trim() || "",
  };
}

export function setGarminProviderConfig(config: GarminProviderConfig) {
  localStorage.setItem(GARMIN_API_BASE_URL_KEY, config.apiBaseUrl.trim());
  setSecret(GARMIN_ACCESS_TOKEN_KEY, config.accessToken.trim());
  localStorage.setItem(GARMIN_USER_ID_KEY, config.userId.trim());
}

export function hasGarminProviderConfig() {
  const config = getGarminProviderConfig();
  return Boolean(config.apiBaseUrl && config.accessToken && config.userId);
}
