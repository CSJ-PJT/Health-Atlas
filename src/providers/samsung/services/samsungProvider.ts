import {
  getSamsungAvailability,
  getSamsungPermissionStatus,
  getSamsungTodaySnapshot,
  requestSamsungPermissions,
} from "@/providers/samsung/services/healthConnectClient";
import { getSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";
import { mapTodaySnapshotToNormalizedHealthData } from "@/providers/samsung/services/samsungMapper";
import type { HealthProvider } from "@/providers/shared/types/provider";

export const samsungProvider: HealthProvider = {
  id: "samsung",
  displayName: "Samsung Health",
  async isAvailable() {
    const isNative = Boolean(
      (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor?.isNativePlatform?.(),
    );
    if (!isNative) {
      return false;
    }

    return getSamsungAvailability();
  },
  async getConnectionStatus() {
    const available = await this.isAvailable();
    if (!available) {
      return {
        connected: false,
        available: false,
        requiresPermission: false,
        lastSyncAt: null,
      };
    }

    const permissionStatus = await getSamsungPermissionStatus();
    return {
      connected: permissionStatus.hasAll,
      available: true,
      requiresPermission: !permissionStatus.hasAll,
      lastSyncAt: getSamsungLastSyncAt(),
    };
  },
  async connect() {
    const granted = await requestSamsungPermissions();
    if (!granted) {
      throw new Error("Health Connect 권한이 필요합니다.");
    }
  },
  async getTodayData() {
    const snapshot = await getSamsungTodaySnapshot();
    return mapTodaySnapshotToNormalizedHealthData(snapshot);
  },
};
