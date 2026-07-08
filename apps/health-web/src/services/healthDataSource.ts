import { sampleHealthDashboardData } from "../data/sampleHealthData";
import type { HealthDashboardData } from "../types";
import { getHealthWebEnv } from "./env";
import { buildSyncStatuses } from "./syncStatus";
import { fetchSupabaseHealthDashboardData } from "./supabaseHealthRepository";

export async function loadHealthDashboardData(): Promise<HealthDashboardData> {
  const env = getHealthWebEnv();

  if (!env.isSupabaseConfigured) {
    return {
      ...sampleHealthDashboardData,
      mode: "unconfigured",
      statusMessage: "Supabase 환경 변수가 없어 샘플 미리보기로 실행 중입니다.",
      syncStatuses: buildSyncStatuses({
        mode: "unconfigured",
        syncedAt: sampleHealthDashboardData.syncedAt,
        message: "Supabase 환경 변수가 없습니다.",
        isConfigured: false,
      }),
    };
  }

  try {
    return await fetchSupabaseHealthDashboardData(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase read failed.";

    return {
      ...sampleHealthDashboardData,
      mode: "error",
      statusMessage: "Supabase 연결 또는 조회 실패로 샘플 미리보기를 표시합니다.",
      syncStatuses: buildSyncStatuses({
        mode: "error",
        syncedAt: sampleHealthDashboardData.syncedAt,
        message,
        isConfigured: true,
      }),
    };
  }
}
