import type { GarminProviderConfig } from "@/providers/garmin/types/garmin";

const GARMIN_API_BASE_URL_KEY = "garmin_api_base_url";
const GARMIN_ACCESS_TOKEN_KEY = "garmin_access_token";
const GARMIN_USER_ID_KEY = "garmin_user_id";

export function getGarminProviderConfig(): GarminProviderConfig {
  return {
    apiBaseUrl: localStorage.getItem(GARMIN_API_BASE_URL_KEY)?.trim() || "",
    accessToken: localStorage.getItem(GARMIN_ACCESS_TOKEN_KEY)?.trim() || "",
    userId: localStorage.getItem(GARMIN_USER_ID_KEY)?.trim() || "",
  };
}

export function setGarminProviderConfig(config: GarminProviderConfig) {
  localStorage.setItem(GARMIN_API_BASE_URL_KEY, config.apiBaseUrl.trim());
  localStorage.setItem(GARMIN_ACCESS_TOKEN_KEY, config.accessToken.trim());
  localStorage.setItem(GARMIN_USER_ID_KEY, config.userId.trim());
}

export function hasGarminProviderConfig() {
  const config = getGarminProviderConfig();
  return Boolean(config.apiBaseUrl && config.accessToken && config.userId);
}
