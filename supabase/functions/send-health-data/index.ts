import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type HealthPayload = {
  syncedAt?: string;
  steps?: unknown;
  exercise?: unknown;
  running?: unknown;
  sleep?: unknown;
  bodyComposition?: unknown;
  nutrition?: unknown;
};

type JsonError = {
  error: string;
};

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((value) => value.trim()).filter(Boolean) ?? ["*"];
const MAX_PAYLOAD_BYTES = 180 * 1024;

function corsHeaders(origin: string | null) {
  const allowedAny = ALLOWED_ORIGINS.includes("*");
  const allowed = Boolean(origin && ALLOWED_ORIGINS.includes(origin));

  return {
    "Access-Control-Allow-Origin": allowedAny || allowed ? (origin ?? "*") : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(payload: JsonError | Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function extractToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (!type || type.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function normalizePayload(payload: unknown): HealthPayload {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as HealthPayload;
}

function validatePayload(payload: HealthPayload) {
  const raw = JSON.stringify(payload ?? {});
  if (raw.length > MAX_PAYLOAD_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const syncedAtValue = payload.syncedAt ? new Date(payload.syncedAt) : new Date();
  if (Number.isNaN(syncedAtValue.getTime()) || syncedAtValue.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new Error("INVALID_SYNCED_AT");
  }

  return {
    syncedAt: syncedAtValue.toISOString(),
    steps: payload.steps ?? null,
    exercise: payload.exercise ?? null,
    running: payload.running ?? null,
    sleep: payload.sleep ?? null,
    bodyComposition: payload.bodyComposition ?? null,
    nutrition: payload.nutrition ?? null,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    const hasNoOriginOrAllowed = !origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
    if (!hasNoOriginOrAllowed) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const token = extractToken(req);
    if (!token) {
    const allowOrigin = !origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
    if (!allowOrigin) {
      return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403, origin);
    }
    return jsonResponse({ error: "MISSING_AUTHORIZATION" }, 401, origin);
  }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "SUPABASE_CONFIG_MISSING" }, 500, origin);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const authResult = await adminClient.auth.getUser(token);
    const user = authResult.data.user;

    if (!user || !user.id) {
      return jsonResponse({ error: "INVALID_AUTH_TOKEN" }, 401, origin);
    }

    const body = await req.json().catch(() => ({} as HealthPayload));
    const payload = normalizePayload(body?.healthData ?? body);
    const normalized = validatePayload(payload);

    const { data, error } = await adminClient.rpc("health_ingest_daily", {
      p_user_id: user.id,
      p_synced_at: normalized.syncedAt,
      p_steps_data: normalized.steps,
      p_exercise_data: normalized.exercise,
      p_running_data: normalized.running,
      p_sleep_data: normalized.sleep,
      p_body_composition_data: normalized.bodyComposition,
      p_nutrition_data: normalized.nutrition,
    });

    if (error) {
      return jsonResponse({ error: "DB_WRITE_FAILED" }, 502, origin);
    }

    const result = data as { ok?: boolean; health_id?: string | null } | null;
    return jsonResponse(
      {
        success: Boolean(result?.ok),
        upserted: true,
        health_id: result?.health_id ?? null,
      },
      200,
      origin,
    );
  } catch (error) {
    const raw = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    const status =
      raw === "PAYLOAD_TOO_LARGE" || raw === "INVALID_SYNCED_AT"
        ? 400
        : 500;
    return jsonResponse({ error: raw }, status, origin);
  }
});
