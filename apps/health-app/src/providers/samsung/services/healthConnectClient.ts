import {
  checkHealthConnectAvailability,
  checkPermissions,
  getTodayHealthData,
  requestPermissions,
} from "@/lib/health-connect";
import { HealthConnect } from "@/lib/healthConnect";
import { createTransferLog } from "@/providers/shared/services/transferLogRepository";
import { getMockSamsungTodaySnapshot } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";

export async function getSamsungAvailability() {
  if (isMockHealthDataEnabled()) {
    return true;
  }
  return checkHealthConnectAvailability();
}

export async function getSamsungPermissionStatus() {
  if (isMockHealthDataEnabled()) {
    return {
      hasAllPermissions: true,
      hasAll: true,
      granted: [],
      missing: [],
      requiredCount: 0,
      grantedCount: 0,
    };
  }
  return checkPermissions();
}

export async function requestSamsungPermissions() {
  if (isMockHealthDataEnabled()) {
    return true;
  }
  return requestPermissions();
}

export async function getSamsungTodaySnapshot() {
  if (isMockHealthDataEnabled()) {
    return getMockSamsungTodaySnapshot();
  }
  return getTodayHealthData();
}

export async function openSamsungHealthConnectSettings() {
  return HealthConnect.openHealthConnectSettings();
}

export async function readSamsungHealthSummary() {
  return HealthConnect.readSummary();
}

export async function checkSamsungHealthBridgePermissions() {
  return HealthConnect.checkPermissions();
}

export async function logSamsungTransferStatus(
  status: "success" | "error" | "pending",
  message: string,
) {
  await createTransferLog("Samsung Health", status, message);
}
