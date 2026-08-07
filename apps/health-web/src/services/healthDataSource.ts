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

type DashboardMode = "signed_in" | "signed_out" | "backend_unavailable" | "error";

function toLoadModeForError(message: string): DashboardMode {
  const status = statusMessageFromError(message);

  if (status === "AUTH_REQUIRED" || status === "SESSION_EXPIRED") {
    return "signed_out";
  }

  if (status === "BACKEND_INACTIVE" || status === "SCHEMA_UNAVAILABLE") {
    return "backend_unavailable";
  }

  if (status === "NO_DATA") {
    return "error";
  }

  return "error";
}

function normalizeErrorMessage(message: string) {
  if (!message) {
    return "건강 데이터 조회에 실패했습니다.";
  }

  return message.includes("health_rpc:") ? message.split(":").slice(2).join(":") : message;
}

async function getSampleDashboard() {
  if (!import.meta.env.DEV) {
    throw new Error("SAMPLE_NOT_ALLOWED");
  }

  const module = await import("../data/sampleHealthData");
  const previewText = await import("./healthSamplePreview");
  return {
    ...(module.sampleHealthDashboardData as HealthDashboardData),
    statusMessage: previewText.samplePreviewMessages.disabled.mode,
    loadMode: "backend_unavailable",
    mode: "sample",
  } as HealthDashboardData;
}

function buildEmptyDashboard(supabaseConfigured: boolean, loadMode: DashboardMode): HealthDashboardData {
  const unknownSync = "";

  return {
    mode: "error",
    loadMode,
    source: "health_get_dashboard",
    syncedAt: unknownSync,
    statusMessage: "건강 데이터 동기화가 준비 중입니다.",
    summary: {
      date: new Date().toISOString().slice(0, 10),
      score: null,
      steps: null,
      activeCalories: null,
      activityMinutes: null,
      restingHeartRate: null,
      weightKg: null,
      sleepHours: null,
      source: "health_get_dashboard",
      syncedAt: unknownSync,
      statusMessage: "동기화된 데이터가 없습니다.",
    },
    trend: [],
    bodyMetrics: [],
    activityMetrics: [],
    sleepMetrics: [],
    syncStatuses: buildSyncStatuses({
      mode: "error",
      loadMode,
      syncedAt: unknownSync,
      message: supabaseConfigured ? "연결이 완료되면 최근 데이터가 반영됩니다." : "Supabase 설정이 필요합니다.",
      isConfigured: supabaseConfigured,
    }),
  };
}

export async function loadHealthDashboardData({ preferSample = false }: LoadOptions = {}): Promise<HealthDashboardData> {
  const env = getHealthWebEnv();

  if (!env.isSupabaseConfigured) {
    if (env.isSamplePreviewEnabled && import.meta.env.DEV && preferSample) {
      return getSampleDashboard();
    }

    return buildEmptyDashboard(false, "backend_unavailable");
  }

  const { session } = await getHealthAuthSession(env);
  if (!session) {
    return {
      ...buildEmptyDashboard(true, "signed_out"),
      loadMode: "signed_out",
      source: "health_get_dashboard",
    statusMessage: "로그인 필요",
      syncStatuses: buildSyncStatuses({
        mode: "error",
        loadMode: "signed_out",
        syncedAt: "",
        message: "로그인이 필요합니다.",
        isConfigured: true,
      }),
    };
  }

  try {
    return await fetchSupabaseHealthDashboardData(env, session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 중 예외가 발생했습니다.";

    if (preferSample && env.isSamplePreviewEnabled && import.meta.env.DEV) {
      const previewText = await import("./healthSamplePreview");
      return {
        ...(await getSampleDashboard()),
        mode: "sample",
        loadMode: "backend_unavailable",
        statusMessage: previewText.samplePreviewMessages.disabled.toSample,
        syncStatuses: buildSyncStatuses({
          mode: "sample",
        loadMode: "backend_unavailable",
          syncedAt: "",
          message: previewText.samplePreviewMessages.disabled.request,
          isConfigured: env.isSupabaseConfigured,
        }),
      };
    }

    const loadMode = toLoadModeForError(message);
    return {
      ...buildEmptyDashboard(env.isSupabaseConfigured, loadMode),
      mode: "error",
      loadMode,
      source: "health_get_dashboard",
      statusMessage: normalizeErrorMessage(message),
      syncStatuses: buildSyncStatuses({
        mode: "error",
        loadMode,
        syncedAt: "",
        message,
        isConfigured: env.isSupabaseConfigured,
      }),
    };
  }
}

export { subscribeAuth };
