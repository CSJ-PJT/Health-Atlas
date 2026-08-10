import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

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

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

let publicClient: SupabaseClient | null = null;
let publicClientKey = "";

function createPublicClient(env: HealthWebEnvStatus) {
  const nextKey = `${env.supabaseUrl ?? ""}|${env.supabasePublishableKey ?? ""}`;
  if (publicClient && publicClientKey === nextKey) {
    return publicClient;
  }

  publicClientKey = nextKey;
  publicClient = createClient(env.supabaseUrl!, env.supabasePublishableKey!, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return publicClient;
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

function asNonNegativeNumber(value: unknown): number | null {
  const num = parseFiniteNumber(value);
  if (num === null || num < 0) {
    return null;
  }
  return Math.round(num * 100) / 100;
}

function mapPoint(row: RpcDashboardRow): HealthTrendPoint {
  const date = row.date ?? "";
  const syncedAt = row.synced_at ?? "";

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
    source: "Samsung Health",
    statusMessage: "",
  };

  const safeSteps = steps ?? 0;
  const safeActivityMinutes = activityMinutes ?? 0;
  const safeSleepHours = sleepHours ?? 0;
  const safeWeightKg = weightKg ?? 0;
  const safeHeartRate = restingHeartRate ?? 0;

  const hasMeaningfulValue = safeSteps > 0 || safeActivityMinutes > 0 || safeSleepHours > 0 || safeWeightKg > 0;
  if (!hasMeaningfulValue) {
    return {
      ...point,
      score: null,
    };
  }

  const stepScore = Math.min(40, Math.round((safeSteps / 10000) * 40));
  const activityScore = Math.min(25, Math.round((safeActivityMinutes / 60) * 25));
  const sleepScore = Math.min(25, Math.round((safeSleepHours / 8) * 25));
  const heartScore = safeHeartRate > 0 && safeHeartRate <= 65 ? 10 : 6;

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
    statusMessage: "최근 동기화 기록",
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

export async function signUpWithEmail(env: HealthWebEnvStatus, email: string, password: string): Promise<SignUpResult> {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const client = createPublicClient(env);
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  return {
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut(env: HealthWebEnvStatus) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const client = createPublicClient(env);
  await client.auth.signOut({ scope: "local" });
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
    throw new Error("health_rpc:AUTH_REQUIRED:인증이 만료되었습니다.");
  }

  const client = createPublicClient(env);
  const { data, error } = await client.rpc("health_get_dashboard", { p_limit: 30 });

  if (error) {
    const status = classifyError(error as ErrorCode);
    const friendlyMessage =
      status === "SCHEMA_UNAVAILABLE"
        ? "서비스 스키마를 확인할 수 없습니다."
        : status === "AUTH_REQUIRED"
          ? "로그인이 필요합니다."
          : status === "PERMISSION_DENIED"
            ? "현재 계정으로 조회할 수 있는 데이터가 없습니다."
            : "Supabase 조회에 실패했습니다.";

    throw new Error(`health_rpc:${status}:${friendlyMessage}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      mode: "supabase",
      loadMode: "signed_in",
      source: "Samsung Health",
      syncedAt: "",
      authState: "SIGNED_IN_NO_DATA",
      statusMessage: "최근 동기화 데이터가 없습니다.",
      summary: {
        date: "",
        syncedAt: "",
        source: "Samsung Health",
        statusMessage: "최근 동기화 데이터가 없습니다.",
        steps: null,
        activeCalories: null,
        activityMinutes: null,
        restingHeartRate: null,
        weightKg: null,
        sleepHours: null,
        score: null,
      },
      trend: [],
      bodyMetrics: [],
      activityMetrics: [],
      sleepMetrics: [],
      syncStatuses: buildSyncStatuses({
        mode: "supabase",
        loadMode: "signed_in",
        syncedAt: "",
        message: "최근 동기화 데이터가 없습니다.",
        isConfigured: env.isSupabaseConfigured,
      }),
    };
  }

  const rawRows = data as RpcDashboardRow[];
  const trend = rawRows.map(mapPoint).filter((point) => Boolean(point.syncedAt));

  if (trend.length === 0) {
    throw new Error("health_rpc:NO_DATA:요약 데이터가 비어있습니다.");
  }

  const ordered = trend.reverse();
  const latest = ordered[ordered.length - 1];
  const summary = buildSummary(latest);

  return {
    mode: "supabase",
    loadMode: "signed_in",
    source: "Samsung Health",
    syncedAt: latest.syncedAt,
    authState: "SIGNED_IN_LIVE",
    statusMessage: session.user?.id ? "실제 건강 데이터 기준으로 표시합니다." : "로그인 정보가 확인되지 않습니다.",
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
      message: "Supabase 연결이 정상입니다.",
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
