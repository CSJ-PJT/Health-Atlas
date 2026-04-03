import { fetchStravaDailyPayload } from "@/providers/strava/services/stravaApiClient";
import { getStravaAuthExpiresAt, getStravaProviderConfig, hasStravaProviderConfig } from "@/providers/strava/services/stravaConfigStore";
import { mapStravaPayloadToNormalizedHealthData } from "@/providers/strava/services/stravaMapper";
import { getMockStravaDailyPayload } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthProvider } from "@/providers/shared/types/provider";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export const stravaProvider: HealthProvider = {
  id: "strava",
  displayName: "Strava",
  async isAvailable() {
    if (isMockHealthDataEnabled()) {
      return true;
    }
    return hasStravaProviderConfig();
  },
  async getConnectionStatus() {
    const available = await this.isAvailable();
    const authExpiresAt = getStravaAuthExpiresAt();
    const issues: string[] = [];
    if (!hasStravaProviderConfig() && !isMockHealthDataEnabled()) {
      issues.push("client_id, refresh_token, athlete_id 설정이 필요합니다.");
    }
    if (authExpiresAt && Number(authExpiresAt) * 1000 < Date.now()) {
      issues.push("Strava access token 만료 시각이 지났습니다. 다음 동기화 때 refresh가 필요합니다.");
    }
    return {
      connected: available,
      available,
      requiresPermission: !available,
      lastSyncAt: localStorage.getItem("strava_last_sync"),
      authExpiresAt: authExpiresAt ? new Date(Number(authExpiresAt) * 1000).toISOString() : null,
      message: available ? "Strava 연동 준비됨" : "Strava 설정이 필요합니다.",
      issues,
    };
  },
  async connect() {
    if (isMockHealthDataEnabled()) {
      return;
    }
    if (!hasStravaProviderConfig()) {
      throw new Error("Strava 연동을 사용하려면 Client ID, Client Secret, Refresh Token, Athlete ID 설정이 필요합니다.");
    }
  },
  async getTodayData() {
    if (isMockHealthDataEnabled()) {
      localStorage.setItem("strava_last_sync", new Date().toISOString());
      return mapStravaPayloadToNormalizedHealthData(getMockStravaDailyPayload());
    }

    if (!hasStravaProviderConfig()) {
      throw new Error("Strava 연동 설정이 아직 완료되지 않았습니다.");
    }

    const payload = await fetchStravaDailyPayload(getStravaProviderConfig(), getTodayDateString());
    localStorage.setItem("strava_last_sync", new Date().toISOString());
    return mapStravaPayloadToNormalizedHealthData(payload);
  },
};
