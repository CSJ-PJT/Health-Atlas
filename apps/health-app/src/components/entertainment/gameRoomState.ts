import type { PlayableGameId } from "@/components/entertainment/playableGames";
import type { MultiRoom } from "@/services/entertainmentTypes";

export type RoomSystemState = {
  gameId: PlayableGameId;
  durationSeconds?: 30 | 60;
  startedAt: string;
};

export function buildSystemMessage(type: "start" | "score" | "turn" | "move" | "capture" | "spawn" | "resolve", payload: Record<string, unknown>) {
  return {
    id: `system-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
}

export function parseLatestStart(room: MultiRoom | null): RoomSystemState | null {
  if (!room) return null;

  const startMessage = [...room.systemEvents]
    .reverse()
    .find((event) => event.type === "start");

  if (!startMessage) return null;

  try {
    const payload = startMessage.payload as RoomSystemState;
    if (!payload?.gameId || !payload?.startedAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildRoomScoreboard(room: MultiRoom | null) {
  if (!room) return [];

  const bestByUser = new Map<string, { name: string; score: number }>();
  room.systemEvents.forEach((event) => {
    if (event.type !== "score") return;
    try {
      const payload = event.payload as {
        userId: string;
        name: string;
        score: number;
      };
      const current = bestByUser.get(payload.userId);
      if (!current || payload.score > current.score) {
        bestByUser.set(payload.userId, { name: payload.name, score: payload.score });
      }
    } catch {
      // ignore malformed payloads
    }
  });

  return Array.from(bestByUser.entries())
    .map(([userId, value]) => ({ userId, name: value.name, score: value.score }))
    .sort((left, right) => right.score - left.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function hasRoomScore(room: MultiRoom | null, userId: string) {
  if (!room) return false;

  return room.systemEvents.some((event) => {
    if (event.type !== "score") return false;
    try {
      const payload = event.payload as {
        userId?: string;
      };
      return payload.userId === userId;
    } catch {
      return false;
    }
  });
}

