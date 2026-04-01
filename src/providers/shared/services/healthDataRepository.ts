import { supabase } from "@/integrations/supabase/client";

export async function fetchHealthHistory(from?: Date, to?: Date) {
  let query = supabase
    .from("health_data")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(30);

  if (from) {
    query = query.gte("synced_at", from.toISOString());
  }
  if (to) {
    query = query.lte("synced_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchHealthStats(from?: Date, to?: Date) {
  let query = supabase
    .from("health_data")
    .select("synced_at, exercise_data, body_composition_data, nutrition_data, running_data, sleep_data, steps_data")
    .order("synced_at", { ascending: true });

  if (from && to) {
    query = query
      .gte("synced_at", from.toISOString())
      .lte("synced_at", to.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}
