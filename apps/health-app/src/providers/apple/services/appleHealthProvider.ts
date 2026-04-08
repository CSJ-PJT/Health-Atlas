import { fetchAppleHealthDailyPayload } from "@/providers/apple/services/appleHealthBackendClient";
import {
  getAppleHealthProviderConfig,
  hasAppleHealthBridgeConfig,
  hasAppleHealthProviderConfig,
} from "@/providers/apple/services/appleConfigStore";
import { mapAppleHealthPayloadToNormalizedHealthData } from "@/providers/apple/services/appleHealthMapper";
import { getMockAppleHealthDailyPayload } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthProvider } from "@/providers/shared/types/provider";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export const appleHealthProvider: HealthProvider = {
  id: "apple-health",
  displayName: "Apple Health",
  async isAvailable() {
    if (isMockHealthDataEnabled()) {
      return true;
    }
    return hasAppleHealthProviderConfig();
  },
  async getConnectionStatus() {
    const available = await this.isAvailable();
    const config = getAppleHealthProviderConfig();
    const issues: string[] = [];
    let connected = available;

    if (!config.appId || !config.teamId || !config.redirectUri) {
      issues.push("Apple Health App ID, Team ID, Redirect URI 설정이 필요합니다.");
    }

    if (available && !hasAppleHealthBridgeConfig() && !isMockHealthDataEnabled()) {
      issues.push("Apple Health bridge URL 또는 access token 설정이 없어 실제 데이터를 불러올 수 없습니다.");
    }

    if (available && hasAppleHealthBridgeConfig() && !isMockHealthDataEnabled()) {
      try {
        await fetchAppleHealthDailyPayload(config, getTodayDateString());
      } catch (error) {
        connected = false;
        issues.push(error instanceof Error ? error.message : "Apple Health bridge 연결 실패");
      }
    }

    return {
      connected,
      available,
      requiresPermission: !connected,
      lastSyncAt: localStorage.getItem("apple_health_last_sync"),
      message: connected ? "Apple Health 연결 상태를 확인했습니다." : "Apple Health 설정 확인이 필요합니다.",
      issues,
    };
  },
  async connect() {
    if (isMockHealthDataEnabled()) {
      return;
    }
    if (!hasAppleHealthProviderConfig()) {
      throw new Error("Apple Health 연동을 사용하려면 App ID, Team ID, Redirect URI 설정이 필요합니다.");
    }
  },
  async getTodayData() {
    if (isMockHealthDataEnabled()) {
      localStorage.setItem("apple_health_last_sync", new Date().toISOString());
      return mapAppleHealthPayloadToNormalizedHealthData(getMockAppleHealthDailyPayload());
    }

    if (!hasAppleHealthProviderConfig()) {
      throw new Error("Apple Health 연동 설정이 아직 완료되지 않았습니다.");
    }

    if (!hasAppleHealthBridgeConfig()) {
      throw new Error("Apple Health 데이터를 읽으려면 bridge URL과 access token 설정이 필요합니다.");
    }

    const payload = await fetchAppleHealthDailyPayload(getAppleHealthProviderConfig(), getTodayDateString());
    localStorage.setItem("apple_health_last_sync", new Date().toISOString());
    return mapAppleHealthPayloadToNormalizedHealthData(payload);
  },
  async getDataForDate(date: string) {
    if (isMockHealthDataEnabled()) {
      localStorage.setItem("apple_health_last_sync", new Date().toISOString());
      return mapAppleHealthPayloadToNormalizedHealthData(getMockAppleHealthDailyPayload());
    }

    if (!hasAppleHealthProviderConfig()) {
      throw new Error("Apple Health 연동 설정이 아직 완료되지 않았습니다.");
    }

    if (!hasAppleHealthBridgeConfig()) {
      throw new Error("Apple Health 데이터를 읽으려면 bridge URL과 access token 설정이 필요합니다.");
    }

    const payload = await fetchAppleHealthDailyPayload(getAppleHealthProviderConfig(), date);
    localStorage.setItem("apple_health_last_sync", new Date().toISOString());
    return mapAppleHealthPayloadToNormalizedHealthData(payload);
  },
};
