import type { StrategyAction, StrategyGameState } from "@/components/entertainment/strategy/strategyTypes";
import type { MultiRoom } from "@/services/entertainmentTypes";
import { supabase } from "@/integrations/supabase/client";

export type StrategySeasonRow = {
  userId: string;
  wins: number;
  losses: number;
  rating: number;
  capturePoints: number;
  rank: number;
};

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

  const { error } = await supabase.from("entertainment_strategy_matches").upsert({
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
  const { error } = await supabase.from("entertainment_strategy_events").insert({
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
  const { error } = await supabase.from("entertainment_strategy_snapshots").upsert({
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
    .from("entertainment_strategy_snapshots")
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

export async function upsertStrategySeasonResults(state: StrategyGameState) {
  const userIds = state.players.map((player) => player.userId);
  const { data } = await supabase
    .from("entertainment_strategy_season_scores")
    .select("*")
    .in("user_id", userIds);

  const existing = new Map(
    ((data || []) as Array<Record<string, unknown>>).map((row) => [
      String(row.user_id),
      {
        wins: Number(row.wins || 0),
        losses: Number(row.losses || 0),
        rating: Number(row.rating || 1000),
        capturePoints: Number(row.capture_points || 0),
      },
    ]),
  );

  const rows = state.players.map((player) => {
    const previous = existing.get(player.userId) || {
      wins: 0,
      losses: 0,
      rating: 1000,
      capturePoints: 0,
    };
    const won = state.winnerUserId === player.userId;
    const ratingDelta = won ? 24 : -12;

    return {
      id: player.userId,
      user_id: player.userId,
      wins: previous.wins + (won ? 1 : 0),
      losses: previous.losses + (won ? 0 : 1),
      rating: Math.max(800, previous.rating + ratingDelta + (player.score >= 120 ? 6 : 0)),
      capture_points: previous.capturePoints + player.score,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("entertainment_strategy_season_scores").upsert(rows);
  return !error;
}

export async function loadStrategySeasonLeaderboard(limit = 20): Promise<StrategySeasonRow[]> {
  const { data, error } = await supabase
    .from("entertainment_strategy_season_scores")
    .select("*")
    .order("rating", { ascending: false })
    .order("capture_points", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row, index) => ({
    userId: String(row.user_id || ""),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    rating: Number(row.rating || 1000),
    capturePoints: Number(row.capture_points || 0),
    rank: index + 1,
  }));
}
