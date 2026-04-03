import type { PlayableGameId } from "@/components/entertainment/GameArena";
import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import {
  type ChallengeEntry,
  type MultiRoom,
} from "@/services/entertainmentTypes";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";

const CHALLENGE_KEY = "game_challenges_v7";
const SCORE_KEY = "playable_game_scores_v4";
const ROOM_KEY = "multiplayer_rooms_v1";

type GameScores = Record<PlayableGameId, number>;

function getProfileId() {
  return localStorage.getItem("profile_id");
}

function buildTextInList(ids: string[]) {
  return `(${ids.map((id) => `"${id.replaceAll("\"", "\\\"")}"`).join(",")})`;
}

export function getStoredEntertainmentChallenges() {
  return readScopedJson<ChallengeEntry[]>(CHALLENGE_KEY, []);
}

export function saveStoredEntertainmentChallenges(challenges: ChallengeEntry[]) {
  writeScopedJson(CHALLENGE_KEY, challenges);
  void syncServerChallenges(challenges);
}

export function getStoredEntertainmentScores() {
  return readScopedJson<GameScores>(SCORE_KEY, {
    "tap-sprint": 0,
    "reaction-grid": 0,
    "pace-memory": 0,
    tetris: 0,
  });
}

export function saveStoredEntertainmentScores(scores: GameScores) {
  writeScopedJson(SCORE_KEY, scores);
  void syncServerScores(scores);
}

export function getStoredEntertainmentRooms() {
  return readScopedJson<MultiRoom[]>(ROOM_KEY, []);
}

export function saveStoredEntertainmentRooms(rooms: MultiRoom[]) {
  writeScopedJson(ROOM_KEY, rooms);
  void syncServerRooms(rooms);
}

export async function hydrateEntertainmentRepositoryFromServer() {
  const [challenges, scores, rooms] = await Promise.all([
    loadServerChallenges(),
    loadServerScores(),
    loadServerRooms(),
  ]);

  let changed = false;

  if (Array.isArray(challenges) && challenges.length > 0) {
    writeScopedJson(CHALLENGE_KEY, challenges);
    changed = true;
  }

  if (scores) {
    writeScopedJson(SCORE_KEY, scores);
    changed = true;
  }

  if (Array.isArray(rooms)) {
    writeScopedJson(ROOM_KEY, rooms);
    changed = true;
  }

  return changed;
}

async function syncServerChallenges(challenges: ChallengeEntry[]) {
  const profileId = getProfileId();
  if (!profileId) return false;

  const incomingIds = challenges.map((item) => item.id);
  if (incomingIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("entertainment_challenges" as never)
      .delete()
      .eq("profile_id", profileId)
      .not("id", "in", buildTextInList(incomingIds));
    if (deleteError) {
      void saveServerSnapshot("entertainment_challenges", challenges);
      return false;
    }
  }

  if (incomingIds.length === 0) {
    const { error } = await supabase.from("entertainment_challenges" as never).delete().eq("profile_id", profileId);
    if (error) {
      void saveServerSnapshot("entertainment_challenges", challenges);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from("entertainment_challenges" as never).upsert(
    challenges.map((challenge) => ({
      id: challenge.id,
      profile_id: profileId,
      title: challenge.title,
      description: challenge.description,
      details: challenge.details,
      reward: challenge.reward,
      icon: challenge.icon,
      progress: challenge.progress,
      joined_user_ids: challenge.joinedUserIds,
      completed_user_ids: challenge.completedUserIds,
      updated_at: new Date().toISOString(),
    })),
  );

  if (error) {
    void saveServerSnapshot("entertainment_challenges", challenges);
    return false;
  }

  return true;
}

async function syncServerScores(scores: GameScores) {
  const profileId = getProfileId();
  if (!profileId) return false;

  const rows = Object.entries(scores).map(([gameId, bestScore]) => ({
    id: `${profileId}:${gameId}`,
    profile_id: profileId,
    game_id: gameId,
    best_score: bestScore,
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await supabase.from("entertainment_scores" as never).delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("entertainment_scores", scores);
    return false;
  }

  const { error } = await supabase.from("entertainment_scores" as never).upsert(rows);
  if (error) {
    void saveServerSnapshot("entertainment_scores", scores);
    return false;
  }

  return true;
}

async function syncServerRooms(rooms: MultiRoom[]) {
  const profileId = getProfileId();
  if (!profileId) return false;

  const incomingIds = rooms.map((item) => item.id);
  if (incomingIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("entertainment_rooms" as never)
      .delete()
      .eq("profile_id", profileId)
      .not("id", "in", buildTextInList(incomingIds));
    if (deleteError) {
      void saveServerSnapshot("entertainment_rooms", rooms);
      return false;
    }
  }

  if (incomingIds.length === 0) {
    const { error } = await supabase.from("entertainment_rooms" as never).delete().eq("profile_id", profileId);
    if (error) {
      void saveServerSnapshot("entertainment_rooms", rooms);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from("entertainment_rooms" as never).upsert(
    rooms.map((room) => ({
      id: room.id,
      profile_id: profileId,
      title: room.title,
      host_id: room.hostId,
      host_name: room.hostName,
      game_id: room.gameId,
      duration_seconds: room.durationSeconds,
      team_mode: room.teamMode,
      participants: room.participants,
      chat: room.chat,
      max_players: room.maxPlayers,
      updated_at: new Date().toISOString(),
    })),
  );

  if (error) {
    void saveServerSnapshot("entertainment_rooms", rooms);
    return false;
  }

  return true;
}

async function loadServerChallenges() {
  const profileId = getProfileId();
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("entertainment_challenges" as never)
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    return loadServerSnapshot<ChallengeEntry[]>("entertainment_challenges");
  }

  return ((data || []) as Array<Record<string, unknown>>).map(
    (row): ChallengeEntry => ({
      id: String(row.id),
      title: String(row.title || ""),
      description: String(row.description || ""),
      details: String(row.details || ""),
      reward: String(row.reward || ""),
      icon: (row.icon as ChallengeEntry["icon"]) || "run",
      progress: Number(row.progress || 0),
      joinedUserIds: Array.isArray(row.joined_user_ids) ? (row.joined_user_ids as string[]) : [],
      completedUserIds: Array.isArray(row.completed_user_ids) ? (row.completed_user_ids as string[]) : [],
    }),
  );
}

async function loadServerScores() {
  const profileId = getProfileId();
  if (!profileId) return null;

  const { data, error } = await supabase.from("entertainment_scores" as never).select("*").eq("profile_id", profileId);
  if (error) {
    return loadServerSnapshot<GameScores>("entertainment_scores");
  }

  return ((data || []) as Array<Record<string, unknown>>).reduce(
    (acc, row) => {
      acc[row.game_id as PlayableGameId] = Number(row.best_score || 0);
      return acc;
    },
    {
      "tap-sprint": 0,
      "reaction-grid": 0,
      "pace-memory": 0,
      tetris: 0,
    } as GameScores,
  );
}

async function loadServerRooms() {
  const profileId = getProfileId();
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("entertainment_rooms" as never)
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    return loadServerSnapshot<MultiRoom[]>("entertainment_rooms");
  }

  return ((data || []) as Array<Record<string, unknown>>).map(
    (row): MultiRoom => ({
      id: String(row.id),
      title: String(row.title || ""),
      hostId: String(row.host_id || ""),
      hostName: String(row.host_name || ""),
      gameId: (row.game_id as PlayableGameId) || "tap-sprint",
      durationSeconds: Number(row.duration_seconds || 30) === 60 ? 60 : 30,
      teamMode: Boolean(row.team_mode),
      participants: Array.isArray(row.participants)
        ? (row.participants as MultiRoom["participants"])
        : [],
      chat: Array.isArray(row.chat) ? (row.chat as MultiRoom["chat"]) : [],
      maxPlayers: Number(row.max_players || 30),
    }),
  );
}
