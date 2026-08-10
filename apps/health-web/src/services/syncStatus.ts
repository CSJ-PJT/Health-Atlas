import type { HealthDataSourceMode, HealthLoadMode, SyncStatus } from "../types";

export type SyncSourceStatusMode = "connected" | "pending" | "inactive" | "error";

type SyncStatusInput = {
  mode: HealthDataSourceMode;
  loadMode: HealthLoadMode;
  syncedAt: string;
  message: string;
  isConfigured: boolean;
};

function toSamsungStatus(input: SyncStatusInput): SyncSourceStatusMode {
  if (input.loadMode === "signed_out") return "inactive";
  if (input.loadMode === "signed_in" && input.syncedAt) return "connected";
  if (input.loadMode === "error") return "error";
  return "pending";
}

export function buildSyncStatuses(input: SyncStatusInput): SyncStatus[] {
  const samsungStatus = toSamsungStatus(input);
  const dashboardStatus = input.mode === "supabase" ? "connected" : input.loadMode === "error" ? "error" : "pending";

  return [
    {
      source: "Samsung Health",
      status: samsungStatus,
      syncedAt: input.syncedAt,
      statusMessage: input.syncedAt
        ? "Samsung Health 데이터가 저장되었습니다."
        : "Samsung Health 동기화가 필요합니다.",
    },
    {
      source: "Health Dashboard",
      status: dashboardStatus,
      syncedAt: input.syncedAt,
      statusMessage: input.isConfigured
        ? input.message
        : "Health Web 환경 설정이 필요합니다.",
    },
  ];
}
