import type { HealthDataSourceMode, SyncStatus } from "../types";

type SyncStatusInput = {
  mode: HealthDataSourceMode;
  syncedAt: string;
  message: string;
  isConfigured: boolean;
};

export function buildSyncStatuses(input: SyncStatusInput): SyncStatus[] {
  const supabaseStatus: SyncStatus["status"] =
    input.mode === "supabase" ? "connected" : input.mode === "error" ? "error" : "inactive";

  return [
    {
      source: "Android Health Connect",
      status: "pending",
      syncedAt: "planned",
      statusMessage: "Android 앱에서 권한을 받아 건강 데이터를 수집하고 Supabase로 보냅니다.",
    },
    {
      source: "Supabase",
      status: supabaseStatus,
      syncedAt: input.isConfigured ? input.syncedAt : "unconfigured",
      statusMessage: input.isConfigured
        ? input.message
        : "VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY가 필요합니다.",
    },
    {
      source: "Last Sync",
      status: input.mode === "supabase" ? "connected" : "pending",
      syncedAt: input.syncedAt,
      statusMessage: input.mode === "supabase" ? "최근 health_data 레코드를 읽었습니다." : "샘플 미리보기 기준입니다.",
    },
    {
      source: "Next Step",
      status: "pending",
      syncedAt: "planning",
      statusMessage: "Android 수집, Supabase 저장, Web 읽기 흐름을 인증/RLS 정책에 맞춰 연결합니다.",
    },
  ];
}
