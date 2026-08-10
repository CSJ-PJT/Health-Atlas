import type { HealthDashboardData } from "../types";
import { getHealthWebEnv } from "./env";
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

  return "error";
}

function normalizeErrorMessage(message: string) {
  if (!message) {
    return "건강 데이터 조회에 실패했습니다.";
  }

  return message.includes("health_rpc:") ? message.split(":").slice(2).join(":") : message;
}

async function getAnonymousSampleDashboard(): Promise<HealthDashboardData> {
  const module = await import("../data/sampleHealthData");
  return {
    ...(module.sampleHealthDashboardData as HealthDashboardData),
    mode: "sample",
    loadMode: "signed_out",
    authState: "ANONYMOUS_SAMPLE",
    source: "샘플 데이터",
    syncedAt: "",
    statusMessage: "샘플 데이터입니다. 로그인하면 Samsung Health에서 동기화된 내 건강 데이터를 확인할 수 있습니다.",
    summary: {
      ...module.sampleHealthDashboardData.summary,
      source: "샘플 데이터",
      syncedAt: "",
      statusMessage: "샘플 기준 예시 건강 기록입니다.",
    },
    syncStatuses: [
      {
        source: "Samsung Health 연동",
        status: "inactive",
        syncedAt: "",
        statusMessage: "로그인 후 Samsung Health 데이터를 연결할 수 있습니다.",
      },
    ],
  };
}

function buildEmptyDashboard(supabaseConfigured: boolean, loadMode: DashboardMode): HealthDashboardData {
  const authState = loadMode === "signed_out" ? "SESSION_EXPIRED" : loadMode === "error" ? "ERROR" : "SIGNED_IN_NO_DATA";
  const message = loadMode === "signed_out" ? "세션이 만료되었습니다. 다시 로그인해 주세요." : "아직 동기화된 건강 기록이 없습니다.";

  return {
    mode: "error",
    loadMode,
    authState,
    source: "Samsung Health",
    syncedAt: "",
    statusMessage: message,
    summary: {
      date: "",
      score: null,
      steps: null,
      activeCalories: null,
      activityMinutes: null,
      restingHeartRate: null,
      weightKg: null,
      sleepHours: null,
      source: "Samsung Health",
      syncedAt: "",
      statusMessage: message,
    },
    trend: [],
    bodyMetrics: [],
    activityMetrics: [],
    sleepMetrics: [],
    syncStatuses: [
      {
        source: "Samsung Health",
        status: loadMode === "signed_in" ? "pending" : "inactive",
        syncedAt: "",
        statusMessage: supabaseConfigured
          ? "Samsung Health 동기화가 필요합니다."
          : "Health Web 환경 설정이 필요합니다.",
      },
    ],
  };
}

export async function loadHealthDashboardData(_options: LoadOptions = {}): Promise<HealthDashboardData> {
  const env = getHealthWebEnv();

  if (!env.isSupabaseConfigured) {
    return buildEmptyDashboard(false, "backend_unavailable");
  }

  const { session } = await getHealthAuthSession(env);
  if (!session) {
    return getAnonymousSampleDashboard();
  }

  try {
    return await fetchSupabaseHealthDashboardData(env, session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 중 예외가 발생했습니다.";
    const loadMode = toLoadModeForError(message);
    return {
      ...buildEmptyDashboard(env.isSupabaseConfigured, loadMode),
      mode: "error",
      loadMode,
      authState: loadMode === "signed_out" ? "SESSION_EXPIRED" : "ERROR",
      source: "Samsung Health",
      statusMessage: normalizeErrorMessage(message),
    };
  }
}

export { subscribeAuth };
