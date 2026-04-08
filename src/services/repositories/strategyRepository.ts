import type { StrategyAction, StrategyGameState } from "@/components/entertainment/strategy/strategyTypes";
import type { MultiRoom } from "@/services/entertainmentTypes";
import { supabase } from "@/integrations/supabase/client";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export function buildStrategySnapshot(state: StrategyGameState) {
  return {
    version: state.turn,
    state,
    savedAt: new Date().toISOString(),
  };
}

export async function upsertStrategyMatch(room: MultiRoom, state: StrategyGameState) {
  const profileId = getProfileId();

  const { error } = await supabase.from("entertainment_strategy_matches" as never).upsert({
    id: room.id,
    room_id: room.id,
    profile_id: profileId,
    game_id: room.gameId,
    mode: room.mode,
    status: state.phase,
    current_turn: state.turn,
    current_user_turn: state.currentUserTurn,
    winner_user_id: state.winnerUserId || null,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

export async function appendStrategyEvent(roomId: string, userId: string, action: StrategyAction) {
  const { error } = await supabase.from("entertainment_strategy_events" as never).insert({
    id: `strategy-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    match_id: roomId,
    room_id: roomId,
    user_id: userId,
    action_type: action.type,
    payload: action,
    created_at: new Date().toISOString(),
  });

  return !error;
}

export async function saveStrategySnapshot(roomId: string, state: StrategyGameState) {
  const snapshot = buildStrategySnapshot(state);
  const { error } = await supabase.from("entertainment_strategy_snapshots" as never).upsert({
    id: `${roomId}:${snapshot.version}`,
    match_id: roomId,
    version: snapshot.version,
    state: snapshot.state,
    created_at: snapshot.savedAt,
  });

  return !error;
}

export async function loadLatestStrategyState(roomId: string) {
  const { data, error } = await supabase
    .from("entertainment_strategy_snapshots" as never)
    .select("*")
    .eq("match_id", roomId)
    .order("version", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const snapshot = data[0] as { state?: StrategyGameState };
  return snapshot.state || null;
}
