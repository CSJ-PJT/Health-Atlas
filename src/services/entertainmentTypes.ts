import type { PlayableGameId } from "@/components/entertainment/GameArena";

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

export type MultiRoom = {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  gameId: PlayableGameId;
  durationSeconds: 30 | 60;
  teamMode: boolean;
  participants: Array<{ userId: string; name: string; isBot?: boolean }>;
  chat: Array<{ id: string; name: string; text: string }>;
  maxPlayers: number;
};
