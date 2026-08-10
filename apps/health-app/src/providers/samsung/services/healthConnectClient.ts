import {
  checkHealthConnectAvailability,
  checkPermissions,
  getTodayHealthData,
  requestPermissions,
} from "@/lib/health-connect";
import { HealthConnect } from "@/lib/healthConnect";
import { createTransferLog } from "@/providers/shared/services/transferLogRepository";
import { buildSamsungOriginFilter } from "@/providers/samsung/services/samsungHealthOrigin";

export async function getSamsungAvailability() {
  return checkHealthConnectAvailability();
}

export async function getSamsungPermissionStatus() {
  return checkPermissions();
}

export async function requestSamsungPermissions() {
  return requestPermissions();
}

export async function getSamsungTodaySnapshot() {
  return getTodayHealthData(buildSamsungOriginFilter());
}

export async function openSamsungHealthConnectSettings() {
  return HealthConnect.openHealthConnectSettings();
}

export async function readSamsungHealthSummary() {
  return HealthConnect.readSummary(buildSamsungOriginFilter());
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
