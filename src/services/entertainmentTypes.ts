import type { PlayableGameId, RoomMode } from "@/components/entertainment/playableGames";
import type { SandboxWorldState } from "@/components/entertainment/sandbox/sandboxTypes";
import type { StrategyGameState } from "@/components/entertainment/strategy/strategyTypes";

export type ChallengeIcon = "run" | "heart" | "sleep" | "team";
export type RankingRange = "weekly" | "monthly";

export type ChallengeEntry = {
  id: string;
  title: string;
  description: string;
  details: string;
  reward: string;
  icon: ChallengeIcon;
  progress: number;
  joinedUserIds: string[];
  completedUserIds: string[];
};

export type RankingRow = {
  name: string;
  userId: string;
  score: number;
  rank: number;
};

export type RoomStatus = "lobby" | "running" | "finished";
export type RoomVisibility = "public" | "friends" | "private";
export type RoomEditableBy = "host" | "everyone" | "friends";
export type StrategyMapId = "frontier-classic-8x8" | "frontier-crossroads-8x8";
export type StrategyMatchup = "1v1" | "2v2";
export type RoomParticipant = { userId: string; name: string; isBot?: boolean; teamId?: string; ready?: boolean };
export type RoomChatMessage = { id: string; name: string; text: string; createdAt: string };
export type RoomSystemEvent = { id: string; type: string; payload: unknown; createdAt: string };
export type RoomRules = {
  mapId?: StrategyMapId;
  maxTurns?: 8 | 12 | 16;
  matchup?: StrategyMatchup;
};

export type MultiRoom = {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  gameId: PlayableGameId;
  mode: RoomMode;
  roomStatus: RoomStatus;
  visibility: RoomVisibility;
  editableBy: RoomEditableBy;
  durationSeconds?: 30 | 60;
  teamMode: boolean;
  participants: RoomParticipant[];
  chatMessages: RoomChatMessage[];
  systemEvents: RoomSystemEvent[];
  maxPlayers: number;
  roomRules?: RoomRules;
  gameState?: StrategyGameState | SandboxWorldState | null;
  updatedAt?: string;
};
