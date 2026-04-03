import { fetchGarminDailyPayload } from "@/providers/garmin/services/garminBackendClient";
import { getGarminProviderConfig, hasGarminProviderConfig } from "@/providers/garmin/services/garminConfigStore";
import { mapGarminPayloadToNormalizedHealthData } from "@/providers/garmin/services/garminMapper";
import { getMockGarminDailyPayload } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthProvider } from "@/providers/shared/types/provider";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export const garminProvider: HealthProvider = {
  id: "garmin",
  displayName: "Garmin",
  async isAvailable() {
    if (isMockHealthDataEnabled()) {
      return true;
    }
    return hasGarminProviderConfig();
  },
  async getConnectionStatus() {
    if (isMockHealthDataEnabled()) {
      return {
        connected: true,
        available: true,
        requiresPermission: false,
        lastSyncAt: localStorage.getItem("garmin_last_sync"),
        message: "Garmin mock 데이터 연결됨",
        issues: [],
      };
    }

    const configured = hasGarminProviderConfig();
    if (!configured) {
      return {
        connected: false,
        available: false,
        requiresPermission: false,
        lastSyncAt: null,
        message: "Garmin API 설정이 필요합니다.",
        issues: ["api_base_url, access_token, user_id 설정이 필요합니다."],
      };
    }

    try {
      await fetchGarminDailyPayload(getGarminProviderConfig(), getTodayDateString());
      return {
        connected: true,
        available: true,
        requiresPermission: false,
        lastSyncAt: localStorage.getItem("garmin_last_sync"),
        message: "Garmin 백엔드 응답 정상",
        issues: [],
      };
    } catch (error) {
      return {
        connected: false,
        available: true,
        requiresPermission: false,
        lastSyncAt: localStorage.getItem("garmin_last_sync"),
        message: "Garmin 백엔드 통신 실패",
        issues: [error instanceof Error ? error.message : "알 수 없는 Garmin 오류"],
      };
    }
  },
  async connect() {
    if (isMockHealthDataEnabled()) {
      return;
    }
    if (!hasGarminProviderConfig()) {
      throw new Error("Garmin 공식 연동용 API Base URL, Access Token, User ID 설정이 필요합니다.");
    }
  },
  async getTodayData() {
    if (isMockHealthDataEnabled()) {
      localStorage.setItem("garmin_last_sync", new Date().toISOString());
      return mapGarminPayloadToNormalizedHealthData(getMockGarminDailyPayload());
    }

    const config = getGarminProviderConfig();
    if (!config.apiBaseUrl || !config.accessToken || !config.userId) {
      throw new Error("Garmin 공식 연동용 설정이 아직 없습니다.");
    }

    const payload = await fetchGarminDailyPayload(config, getTodayDateString());
    localStorage.setItem("garmin_last_sync", new Date().toISOString());
    return mapGarminPayloadToNormalizedHealthData(payload);
  },
};
