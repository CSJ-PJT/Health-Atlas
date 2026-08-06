import { sampleHealthDashboardData } from "../data/sampleHealthData";
import type { HealthDashboardData } from "../types";
import { getHealthWebEnv } from "./env";
import { buildSyncStatuses } from "./syncStatus";
import {
  fetchSupabaseHealthDashboardData,
  getHealthAuthSession,
  subscribeAuth,
  statusMessageFromError,
} from "./supabaseHealthRepository";

type LoadOptions = {
  preferSample?: boolean;
};

function toLoadModeForError(message: string) {
  const status = statusMessageFromError(message);

  if (status === "AUTH_REQUIRED" || status === "SESSION_EXPIRED") {
    return "signed_out" as const;
  }

  if (status === "BACKEND_INACTIVE" || status === "SCHEMA_UNAVAILABLE") {
    return "backend_unavailable" as const;
  }

  if (status === "NO_DATA") {
    return "error" as const;
  }

  return "error" as const;
}

function normalizeErrorMessage(message: string) {
  if (!message) {
    return "실제 데이터 조회 실패";
  }

  return message.includes("health_rpc:")
    ? message.split(":").slice(2).join(":")
    : message;
}

export async function loadHealthDashboardData({ preferSample = false }: LoadOptions = {}): Promise<HealthDashboardData> {
  const env = getHealthWebEnv();

  if (!env.isSupabaseConfigured) {
    return {
      ...sampleHealthDashboardData,
      mode: "unconfigured",
      loadMode: "backend_unavailable",
      statusMessage: "로그인 환경이 준비되지 않아 샘플 데이터만 표시합니다.",
      syncStatuses: buildSyncStatuses({
        mode: "unconfigured",
        loadMode: "backend_unavailable",
        syncedAt: sampleHealthDashboardData.syncedAt,
        message: "환경 설정 값을 확인하세요.",
        isConfigured: false,
      }),
    };
  }

  const { session } = await getHealthAuthSession(env);
  if (!session) {
    return {
      ...sampleHealthDashboardData,
      mode: "error",
      loadMode: "signed_out",
      source: "health_get_dashboard",
      statusMessage: "로그인 후 실제 건강 데이터를 확인할 수 있습니다.",
      syncStatuses: buildSyncStatuses({
        mode: "error",
        loadMode: "signed_out",
        syncedAt: sampleHealthDashboardData.syncedAt,
        message: "세션이 필요합니다. 로그인 후 확인하세요.",
        isConfigured: true,
      }),
    };
  }

  try {
    return await fetchSupabaseHealthDashboardData(env, session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "데이터 로드 중 알 수 없는 오류가 발생했습니다.";

    if (preferSample) {
      return {
        ...sampleHealthDashboardData,
        mode: "sample",
        loadMode: "backend_unavailable",
        statusMessage: "요청한 샘플 모드입니다. 실제 데이터와는 별도 표시됩니다.",
        syncStatuses: buildSyncStatuses({
          mode: "sample",
          loadMode: "backend_unavailable",
          syncedAt: sampleHealthDashboardData.syncedAt,
          message: "샘플 미리보기 모드",
          isConfigured: env.isSupabaseConfigured,
        }),
      };
    }

    const loadMode = toLoadModeForError(message);
    return {
      ...sampleHealthDashboardData,
      mode: "error",
      loadMode,
      source: "health_get_dashboard",
      statusMessage: normalizeErrorMessage(message),
      syncStatuses: buildSyncStatuses({
        mode: "error",
        loadMode,
        syncedAt: sampleHealthDashboardData.syncedAt,
        message,
        isConfigured: env.isSupabaseConfigured,
      }),
    };
  }
}

export { subscribeAuth };
