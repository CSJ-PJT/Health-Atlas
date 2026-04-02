import { getMockNormalizedHealthData } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthProvider } from "@/providers/shared/types/provider";
import { hasAppleHealthProviderConfig } from "@/providers/apple/services/appleConfigStore";

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
    return {
      connected: available,
      available,
      requiresPermission: !available,
      lastSyncAt: localStorage.getItem("apple_health_last_sync"),
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
    if (!isMockHealthDataEnabled() && !hasAppleHealthProviderConfig()) {
      throw new Error("Apple Health 연동 설정이 아직 완료되지 않았습니다.");
    }

    localStorage.setItem("apple_health_last_sync", new Date().toISOString());
    return getMockNormalizedHealthData("apple-health");
  },
};
