import { supabase } from "@/integrations/supabase/client";
import { getDefaultRangeForMode, getMockHealthHistory } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthViewMode } from "@/providers/shared/types/provider";

function getStartBoundary(date?: Date) {
  if (!date) {
    return undefined;
  }

  const boundary = new Date(date);
  boundary.setHours(0, 0, 0, 0);
  return boundary;
}

function getEndBoundary(date?: Date) {
  if (!date) {
    return undefined;
  }

  const boundary = new Date(date);
  boundary.setHours(23, 59, 59, 999);
  return boundary;
}

function resolveDateRange(mode: HealthViewMode, from?: Date, to?: Date) {
  const defaults = getDefaultRangeForMode(mode);
  return {
    startBoundary: getStartBoundary(from || defaults.start),
    endBoundary: getEndBoundary(to || defaults.end),
  };
}

function filterMockRecords(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const allRecords = getMockHealthHistory();

  const filtered = allRecords.filter((record) => {
    const syncedAt = new Date(record.synced_at).getTime();
    if (startBoundary && syncedAt < startBoundary.getTime()) {
      return false;
    }
    if (endBoundary && syncedAt > endBoundary.getTime()) {
      return false;
    }
    return true;
  });

  if (filtered.length > 0) {
    return filtered;
  }

  if (mode === "day") {
    return allRecords.slice(-1);
  }
  if (mode === "week") {
    return allRecords.slice(-7);
  }
  if (mode === "month") {
    return allRecords.slice(-30);
  }
  return allRecords.slice(-365);
}

export async function fetchHealthHistory(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const mockRecords = filterMockRecords(mode, from, to);

  if (isMockHealthDataEnabled()) {
    return mockRecords.sort(
      (left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime(),
    );
  }

  let query = supabase.from("health_data").select("*").order("synced_at", { ascending: false }).limit(400);

  if (startBoundary) {
    query = query.gte("synced_at", startBoundary.toISOString());
  }
  if (endBoundary) {
    query = query.lte("synced_at", endBoundary.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Falling back to mock history data:", error);
    return mockRecords.sort((left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime());
  }

  if (!data || data.length === 0) {
    return mockRecords.sort((left, right) => new Date(right.synced_at).getTime() - new Date(left.synced_at).getTime());
  }

  return data;
}

export async function fetchHealthStats(mode: HealthViewMode, from?: Date, to?: Date) {
  const { startBoundary, endBoundary } = resolveDateRange(mode, from, to);
  const mockRecords = filterMockRecords(mode, from, to);

  if (isMockHealthDataEnabled()) {
    return mockRecords.sort(
      (left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime(),
    );
  }

  let query = supabase
    .from("health_data")
    .select("synced_at, exercise_data, body_composition_data, nutrition_data, running_data, sleep_data, steps_data")
    .order("synced_at", { ascending: true });

  if (startBoundary) {
    query = query.gte("synced_at", startBoundary.toISOString());
  }
  if (endBoundary) {
    query = query.lte("synced_at", endBoundary.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Falling back to mock stats data:", error);
    return mockRecords.sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  }

  if (!data || data.length === 0) {
    return mockRecords.sort((left, right) => new Date(left.synced_at).getTime() - new Date(right.synced_at).getTime());
  }

  return data;
}
