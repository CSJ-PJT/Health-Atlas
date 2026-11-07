export type LinkStatus = "unlinked" | "linked" | "paused";

export type GameLinkProfile = {
  activityTier: 0 | 1 | 2 | 3;
  sleepTier: 0 | 1 | 2 | 3;
  recoveryTier: 0 | 1 | 2 | 3;
  hydrationTier: 0 | 1 | 2 | 3;
  consistencyScore: number;
  weeklyMovementScore: number;
  focusScore: number;
  resonancePoints: number;
  dailyMissionFlags: string[];
  weeklyMissionFlags: string[];
  lastRefreshAt: string | null;
};

export type GameLinkMission = {
  id: string;
  missionScope: "daily" | "weekly";
  missionKey: string;
  title: string;
  description: string;
  status: "available" | "completed" | "claimed";
};

export type GameLinkReward = {
  id: string;
  rewardKey: string;
  rewardType: string;
  payload: Record<string, unknown>;
  grantedAt: string;
  claimedAt: string | null;
};

export type GameAccountLink = {
  profileId: string;
  userId: string;
  gameAccountId: string;
  productKey: string;
  linkStatus: LinkStatus;
  linkToken: string | null;
  linkedAt: string | null;
};

export type GameLinkBundle = {
  accountLink: GameAccountLink | null;
  profile: GameLinkProfile | null;
  missions: GameLinkMission[];
  rewards: GameLinkReward[];
};