import type { PlayableGameId } from "@/components/entertainment/GameArena";
import type { MultiRoom } from "@/services/entertainmentTypes";

export type RoomSystemState = {
  gameId: PlayableGameId;
  durationSeconds: 30 | 60;
  startedAt: string;
};

export function buildSystemMessage(type: "start" | "score", payload: Record<string, unknown>) {
  return `__system__:${type}:${JSON.stringify(payload)}`;
}

export function parseLatestStart(room: MultiRoom | null): RoomSystemState | null {
  if (!room) return null;

  const startMessage = [...room.chat]
    .reverse()
    .find((message) => typeof message.text === "string" && message.text.startsWith("__system__:start:"));

  if (!startMessage) return null;

  try {
    const payload = JSON.parse(startMessage.text.replace("__system__:start:", "")) as RoomSystemState;
    if (!payload?.gameId || !payload?.durationSeconds || !payload?.startedAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildRoomScoreboard(room: MultiRoom | null) {
  if (!room) return [];

  const bestByUser = new Map<string, { name: string; score: number }>();
  room.chat.forEach((message) => {
    if (!message.text.startsWith("__system__:score:")) return;
    try {
      const payload = JSON.parse(message.text.replace("__system__:score:", "")) as {
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

  return room.chat.some((message) => {
    if (!message.text.startsWith("__system__:score:")) return false;
    try {
      const payload = JSON.parse(message.text.replace("__system__:score:", "")) as {
        userId?: string;
      };
      return payload.userId === userId;
    } catch {
      return false;
    }
  });
}
