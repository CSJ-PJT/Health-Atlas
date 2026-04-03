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
    let connected = available;

    if (!hasStravaProviderConfig() && !isMockHealthDataEnabled()) {
      issues.push("client_id, client_secret, refresh_token, athlete_id 설정이 필요합니다.");
    }

    if (authExpiresAt && Number(authExpiresAt) * 1000 < Date.now()) {
      issues.push("Strava access token 만료 시간이 지났습니다. 다음 동기화 때 refresh가 필요합니다.");
    }

    if (available && !isMockHealthDataEnabled()) {
      try {
        await fetchStravaDailyPayload(getStravaProviderConfig(), getTodayDateString());
      } catch (error) {
        connected = false;
        issues.push(error instanceof Error ? error.message : "Strava API 연결 실패");
      }
    }

    return {
      connected,
      available,
      requiresPermission: !connected,
      lastSyncAt: localStorage.getItem("strava_last_sync"),
      authExpiresAt: authExpiresAt ? new Date(Number(authExpiresAt) * 1000).toISOString() : null,
      message: connected ? "Strava 연결 확인 완료" : "Strava 설정 확인이 필요합니다.",
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
  async getDataForDate(date: string) {
    if (isMockHealthDataEnabled()) {
      localStorage.setItem("strava_last_sync", new Date().toISOString());
      return mapStravaPayloadToNormalizedHealthData(getMockStravaDailyPayload());
    }

    if (!hasStravaProviderConfig()) {
      throw new Error("Strava 연동 설정이 아직 완료되지 않았습니다.");
    }

    const payload = await fetchStravaDailyPayload(getStravaProviderConfig(), date);
    localStorage.setItem("strava_last_sync", new Date().toISOString());
    return mapStravaPayloadToNormalizedHealthData(payload);
  },
};
