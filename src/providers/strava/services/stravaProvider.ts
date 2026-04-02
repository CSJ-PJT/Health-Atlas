import { getMockNormalizedHealthData } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthProvider } from "@/providers/shared/types/provider";
import { hasStravaProviderConfig } from "@/providers/strava/services/stravaConfigStore";

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
    return {
      connected: available,
      available,
      requiresPermission: !available,
      lastSyncAt: localStorage.getItem("strava_last_sync"),
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
    if (!isMockHealthDataEnabled() && !hasStravaProviderConfig()) {
      throw new Error("Strava 연동 설정이 아직 완료되지 않았습니다.");
    }

    localStorage.setItem("strava_last_sync", new Date().toISOString());
    return getMockNormalizedHealthData("strava");
  },
};
