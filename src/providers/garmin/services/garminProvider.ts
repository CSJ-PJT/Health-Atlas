import type { HealthProvider } from "@/providers/shared/types/provider";

function notImplemented(): never {
  throw new Error("Garmin provider is not implemented yet.");
}

export const garminProvider: HealthProvider = {
  id: "garmin",
  displayName: "Garmin",
  async isAvailable() {
    return false;
  },
  async getConnectionStatus() {
    return {
      connected: false,
      available: false,
      requiresPermission: false,
      lastSyncAt: null,
    };
  },
  async connect() {
    notImplemented();
  },
  async getTodayData() {
    notImplemented();
  },
};
