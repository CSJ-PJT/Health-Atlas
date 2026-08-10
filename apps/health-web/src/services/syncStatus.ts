import type { HealthDataSourceMode, HealthLoadMode, SyncStatus } from "../types";

export type SyncSourceStatusMode = "connected" | "pending" | "inactive" | "error";

type SyncStatusInput = {
  mode: HealthDataSourceMode;
  loadMode: HealthLoadMode;
  syncedAt: string;
  message: string;
  isConfigured: boolean;
};

function toStatus(mode: HealthDataSourceMode, loadMode: HealthLoadMode): SyncSourceStatusMode {
  if (loadMode === "signed_out") {
    return "inactive";
  }

  if (loadMode === "signed_in") {
    return mode === "supabase" ? "connected" : "pending";
  }

  if (mode === "supabase") {
    return "connected";
  }

  if (mode === "error") {
    return loadMode === "error" ? "error" : "pending";
  }

  return "pending";
}

export function buildSyncStatuses(input: SyncStatusInput): SyncStatus[] {
  const status = toStatus(input.mode, input.loadMode);

  return [
    {
      source: "Android",
      status: input.loadMode === "signed_in" ? "connected" : input.loadMode === "signed_out" ? "inactive" : "pending",
      syncedAt: input.syncedAt,
      statusMessage:
        input.loadMode === "signed_in"
          ? "Android 앱에서 수집한 최신 데이터는 동기화 시간 기준으로 반영됩니다."
          : "로그인 후 Android 동기화를 시작할 수 있습니다.",
    },
    {
      source: "Supabase",
      status,
      syncedAt: input.isConfigured ? input.syncedAt : "",
      statusMessage:
        input.isConfigured
          ? input.message
          : "Supabase URL 또는 Publishable Key 설정이 필요해 연결 상태를 확인할 수 없습니다.",
    },
    {
      source: "Health Web",
      status: input.loadMode === "signed_out" ? "inactive" : input.mode === "supabase" ? "connected" : "pending",
      syncedAt: input.syncedAt,
      statusMessage:
        input.mode === "supabase"
          ? "대시보드가 인증 사용자 기준 데이터로 표시됩니다."
          : "실제 데이터 연결이 준비되면 즉시 실제 값으로 전환됩니다.",
    },
    {
      source: "Sync Pipeline",
      status: input.loadMode === "signed_in" && input.syncedAt ? "connected" : "pending",
      syncedAt: input.syncedAt,
      statusMessage: input.syncedAt ? "최근 건강 데이터가 저장되었습니다." : "최근 동기화 데이터가 없습니다.",
    },
  ];
}
