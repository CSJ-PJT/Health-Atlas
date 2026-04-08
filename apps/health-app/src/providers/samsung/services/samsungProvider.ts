import {
  getSamsungAvailability,
  getSamsungPermissionStatus,
  getSamsungTodaySnapshot,
  requestSamsungPermissions,
} from "@/providers/samsung/services/healthConnectClient";
import { getSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";
import { mapTodaySnapshotToNormalizedHealthData } from "@/providers/samsung/services/samsungMapper";
import type { HealthProvider } from "@/providers/shared/types/provider";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

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
    const hasAllPermissions = permissionStatus.hasAllPermissions ?? permissionStatus.hasAll;
    return {
      connected: hasAllPermissions,
      available: true,
      requiresPermission: !hasAllPermissions,
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
  async getDataForDate(date: string) {
    if (date !== getTodayDateString()) {
      throw new Error("Samsung Health는 현재 앱에서 당일 데이터만 직접 가져올 수 있습니다.");
    }

    const snapshot = await getSamsungTodaySnapshot();
    return mapTodaySnapshotToNormalizedHealthData(snapshot);
  },
};
