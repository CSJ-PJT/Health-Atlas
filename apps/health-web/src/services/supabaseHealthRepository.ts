import { createClient, type Session } from "@supabase/supabase-js";

import type {
  HealthDashboardData,
  HealthQueryStatus,
  HealthSummary,
  HealthTrendPoint,
} from "../types";
import type { HealthWebEnvStatus } from "./env";
import { buildSyncStatuses } from "./syncStatus";

type RpcDashboardRow = {
  date: string | null;
  synced_at: string | null;
  steps: unknown;
  active_calories: unknown;
  activity_minutes: unknown;
  resting_heart_rate: unknown;
  sleep_hours: unknown;
  weight_kg: unknown;
  source: string | null;
};

type ErrorCode = { code?: string; status?: number; message?: string };

type RpcResult = {
  ok: boolean;
  health_id: string | null;
};

function createPublicClient(env: HealthWebEnvStatus) {
  return createClient(env.supabaseUrl!, env.supabasePublishableKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const next = value.trim();
    if (!next) {
      return null;
    }
    const num = Number(next);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function asNonNegativeNumber(value: unknown): number {
  const num = parseFiniteNumber(value);
  if (num === null || num < 0) {
    return 0;
  }
  return Math.round(num * 100) / 100;
}

function mapPoint(row: RpcDashboardRow): HealthTrendPoint {
  const date = row.date ?? new Date().toISOString().slice(0, 10);
  const syncedAt = row.synced_at ?? new Date().toISOString();

  const steps = asNonNegativeNumber(row.steps);
  const activeCalories = asNonNegativeNumber(row.active_calories);
  const activityMinutes = asNonNegativeNumber(row.activity_minutes);
  const restingHeartRate = asNonNegativeNumber(row.resting_heart_rate);
  const sleepHours = asNonNegativeNumber(row.sleep_hours);
  const weightKg = asNonNegativeNumber(row.weight_kg);

  const point: Omit<HealthTrendPoint, "score"> = {
    date,
    syncedAt,
    steps,
    activeCalories,
    activityMinutes,
    restingHeartRate,
    weightKg,
    sleepHours,
    source: row.source ?? "health_dashboard",
    statusMessage: "인증 사용자용 정제 데이터",
  };

  const hasMeaningfulValue = steps > 0 || activityMinutes > 0 || sleepHours > 0 || weightKg > 0;
  if (!hasMeaningfulValue) {
    return {
      ...point,
      score: null,
    };
  }

  const stepScore = Math.min(40, Math.round((steps / 10000) * 40));
  const activityScore = Math.min(25, Math.round((activityMinutes / 60) * 25));
  const sleepScore = Math.min(25, Math.round((sleepHours / 8) * 25));
  const heartScore = restingHeartRate > 0 && restingHeartRate <= 65 ? 10 : 6;

  return {
    ...point,
    score: Math.max(0, Math.min(100, stepScore + activityScore + sleepScore + heartScore)),
  };
}

function buildSummary(latest: HealthTrendPoint): HealthSummary {
  return {
    date: latest.date,
    syncedAt: latest.syncedAt,
    source: latest.source,
    statusMessage: "최근 1일 요약",
    steps: latest.steps,
    activeCalories: latest.activeCalories,
    activityMinutes: latest.activityMinutes,
    restingHeartRate: latest.restingHeartRate,
    weightKg: latest.weightKg,
    sleepHours: latest.sleepHours,
    score: latest.score,
  };
}

function classifyError(error: ErrorCode): HealthQueryStatus {
  const rawMessage = ((error?.message ?? "") as string).toLowerCase();
  const status = error?.status;
  const code = error?.code;

  if (status === 401) {
    return "AUTH_REQUIRED";
  }

  if (status === 403) {
    return "PERMISSION_DENIED";
  }

  if (rawMessage.includes("schema cache") || rawMessage.includes("could not find the function") || code === "PGRST202") {
    return "SCHEMA_UNAVAILABLE";
  }

  if (rawMessage.includes("session") && rawMessage.includes("expired")) {
    return "SESSION_EXPIRED";
  }

  if (rawMessage.includes("does not exist") || rawMessage.includes("not found")) {
    return "SCHEMA_UNAVAILABLE";
  }

  if (rawMessage.includes("no rows") || rawMessage.includes("no data")) {
    return "NO_DATA";
  }

  if (status === 0 || rawMessage.includes("failed to fetch") || rawMessage.includes("network")) {
    return "NETWORK_ERROR";
  }

  return "UNKNOWN";
}

export async function getHealthAuthSession(env: HealthWebEnvStatus) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    return { session: null, client: null };
  }

  const client = createPublicClient(env);
  const { data, error } = await client.auth.getSession();
  if (error) {
    return { session: null, client };
  }
  return { session: data.session, client };
}

export async function signInWithEmail(env: HealthWebEnvStatus, email: string, password: string) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const client = createPublicClient(env);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signOut(env: HealthWebEnvStatus) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const client = createPublicClient(env);
  await client.auth.signOut();
}

export async function subscribeAuth(env: HealthWebEnvStatus, callback: (session: Session | null) => void) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    return { client: null, unsubscribe: () => {} };
  }

  const client = createPublicClient(env);
  const { data: sessionData } = await client.auth.getSession();
  callback(sessionData.session);

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, nextSession) => {
    callback(nextSession);
  });

  return {
    client,
    unsubscribe: () => {
      subscription.unsubscribe();
    },
  };
}

export async function fetchSupabaseHealthDashboardData(
  env: HealthWebEnvStatus,
  session: Session,
): Promise<HealthDashboardData> {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  if (!session.access_token) {
    throw new Error("health_rpc:AUTH_REQUIRED:세션 정보가 불완전합니다.");
  }

  const client = createPublicClient(env);
  const { data, error } = await client.rpc("health_get_dashboard", { p_limit: 30 });

  if (error) {
    const status = classifyError(error as ErrorCode);
    const friendlyMessage =
      status === "SCHEMA_UNAVAILABLE"
        ? "백엔드 조회 함수를 사용할 수 없습니다."
        : status === "AUTH_REQUIRED"
          ? "로그인 세션이 필요합니다."
          : status === "PERMISSION_DENIED"
            ? "조회 권한이 없어 현재 계정 데이터만 표시합니다."
            : "Supabase 조회 중 오류가 발생했습니다.";

    throw new Error(`health_rpc:${status}:${friendlyMessage}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      mode: "error",
      loadMode: "error",
      source: "health_get_dashboard",
      syncedAt: new Date().toISOString(),
      statusMessage: "동기화된 건강 데이터가 없습니다.",
      summary: {
        date: new Date().toISOString().slice(0, 10),
        syncedAt: new Date().toISOString(),
        source: "health_get_dashboard",
        statusMessage: "동기화 데이터 없음",
        steps: 0,
        activeCalories: 0,
        activityMinutes: 0,
        restingHeartRate: 0,
        weightKg: 0,
        sleepHours: 0,
        score: null,
      },
      trend: [],
      bodyMetrics: [],
      activityMetrics: [],
      sleepMetrics: [],
      syncStatuses: buildSyncStatuses({
        mode: "error",
        loadMode: "error",
        syncedAt: new Date().toISOString(),
        message: "동기화된 데이터가 없습니다.",
        isConfigured: env.isSupabaseConfigured,
      }),
    };
  }

  const rawRows = data as RpcDashboardRow[];
  const trend = rawRows.map(mapPoint).filter((point) => Boolean(point.syncedAt));

  if (trend.length === 0) {
    throw new Error("health_rpc:NO_DATA:조회 응답을 해석할 수 없습니다.");
  }

  const ordered = trend.reverse();
  const latest = ordered[ordered.length - 1];
  const summary = buildSummary(latest);

  return {
    mode: "supabase",
    loadMode: "signed_in",
    source: "health_get_dashboard",
    syncedAt: latest.syncedAt,
    statusMessage: session.user?.id ? "실제 인증 사용자 데이터만 표시했습니다." : "세션이 불완전합니다.",
    summary,
    trend: ordered,
    bodyMetrics: ordered.map(({ date, weightKg, source, syncedAt }) => ({
      date,
      weightKg,
      source,
      syncedAt,
    })),
    activityMetrics: ordered.map(({ date, steps, activeCalories, activityMinutes, source, syncedAt }) => ({
      date,
      steps,
      activeCalories,
      activityMinutes,
      source,
      syncedAt,
    })),
    sleepMetrics: ordered.map(({ date, sleepHours, source, syncedAt }) => ({
      date,
      sleepHours,
      source,
      syncedAt,
    })),
    syncStatuses: buildSyncStatuses({
      mode: "supabase",
      loadMode: "signed_in",
      syncedAt: latest.syncedAt,
      message: "Supabase 인증 조회가 정상 동작합니다.",
      isConfigured: env.isSupabaseConfigured,
    }),
  };
}

export function statusMessageFromError(message: string): HealthQueryStatus {
  if (!message.includes("health_rpc:")) {
    return "UNKNOWN";
  }

  const [, status] = message.split(":", 3);
  return (status as HealthQueryStatus) || "UNKNOWN";
}
