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

  if (mode === "unconfigured") {
    return "inactive";
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
      syncedAt: "planning",
      statusMessage:
        input.loadMode === "signed_in"
          ? "마지막 동기화된 Android 업로드 결과를 대시보드에서 반영 대기 중입니다."
          : "Android 로그인/권한 승인 후 동기화 상태를 확인할 수 있습니다.",
    },
    {
      source: "Supabase",
      status,
      syncedAt: input.isConfigured ? input.syncedAt : "unconfigured",
      statusMessage:
        input.isConfigured
          ? input.message
          : "Supabase URL 또는 Publishable Key가 설정되지 않아 조회가 일시 중단되었습니다.",
    },
    {
      source: "Health Web",
      status: input.mode === "supabase" ? "connected" : "pending",
      syncedAt: input.syncedAt,
      statusMessage:
        input.mode === "supabase"
          ? "조회한 건을 기반으로 최근 수치와 추세를 표시합니다."
          : "안전한 조회 경로에서 데이터가 준비되는 대로 화면이 갱신됩니다.",
    },
    {
      source: "Sync Pipeline",
      status: "pending",
      syncedAt: "planning",
      statusMessage: "Android 수집, 업로드, 대시보드 반영 순서를 점검해 운영 동기화 지연을 감지합니다.",
    },
  ];
}
