import type {
  StrategyGameState,
  StrategyHealthBonuses,
  StrategyPlayerState,
  StrategyTile,
  StrategyUnit,
} from "@/components/entertainment/strategy/strategyTypes";
import { supabase } from "@/integrations/supabase/client";
import type { StrategyMapId, StrategyMatchup } from "@/services/entertainmentTypes";

type Participant = { userId: string; name: string; isBot?: boolean; teamId?: string };
type PulseFrontierBonusOverrides = Record<string, StrategyHealthBonuses>;

const BASE_POSITIONS = [
  { x: 0, y: 0 },
  { x: 7, y: 7 },
  { x: 7, y: 0 },
  { x: 0, y: 7 },
];

function buildDefaultHealthBonuses(participant: Participant): StrategyHealthBonuses {
  const steps = Number(localStorage.getItem("today_steps") || 9200);
  const sleepScore = Number(localStorage.getItem("today_sleep_score") || 78);
  const weeklyRuns = Number(localStorage.getItem("weekly_run_consistency") || 4);

  if (participant.isBot) {
    return {
      startEnergy: 3,
      defenseBoost: 0,
      scoutRangeBoost: 0,
    };
  }

  return {
    startEnergy: steps >= 8000 ? 10 : 4,
    defenseBoost: sleepScore >= 80 ? 1 : 0,
    scoutRangeBoost: weeklyRuns >= 4 ? 1 : 0,
  };
}

export async function loadPulseFrontierBonusOverrides(
  participants: Participant[],
): Promise<PulseFrontierBonusOverrides> {
  const myUserId = localStorage.getItem("user_id") || "me";
  const seed = Object.fromEntries(
    participants.map((participant) => [participant.userId, buildDefaultHealthBonuses(participant)]),
  ) as PulseFrontierBonusOverrides;

  const targetParticipant = participants.find((participant) => participant.userId === myUserId && !participant.isBot);
  if (!targetParticipant) {
    return seed;
  }

  const { data, error } = await supabase
    .from("health_data")
    .select("exercise_data, sleep_data, nutrition_data, steps_data, resting_heart_rate")
    .eq("user_id", myUserId)
    .order("synced_at", { ascending: false })
    .limit(14);

  if (error || !Array.isArray(data) || data.length === 0) {
    return seed;
  }

  const stepsAverage =
    data.reduce((sum, row) => sum + Number((row as { steps_data?: { count?: number } }).steps_data?.count || 0), 0) /
    Math.max(data.length, 1);
  const sleepAverage =
    data.reduce((sum, row) => sum + Number((row as { sleep_data?: { totalMinutes?: number } }).sleep_data?.totalMinutes || 0), 0) /
    Math.max(data.length, 1);
  const proteinAverage =
    data.reduce((sum, row) => sum + Number((row as { nutrition_data?: { protein?: number } }).nutrition_data?.protein || 0), 0) /
    Math.max(data.length, 1);
  const restingHeartRateSamples = data
    .map((row) => Number((row as { resting_heart_rate?: number }).resting_heart_rate || 0))
    .filter((value) => value > 0);
  const restingHeartRateAverage =
    restingHeartRateSamples.reduce((sum, value) => sum + value, 0) / Math.max(restingHeartRateSamples.length, 1);
  const weeklyRunSessions = data.reduce((sum, row) => {
    const exercise = Array.isArray((row as { exercise_data?: unknown[] }).exercise_data)
      ? ((row as { exercise_data?: Array<{ type?: string; exerciseType?: string }> }).exercise_data as Array<{
          type?: string;
          exerciseType?: string;
        }>)
      : [];

    return (
      sum +
      exercise.filter((entry) =>
        `${entry.type || ""} ${entry.exerciseType || ""}`.toLowerCase().includes("run"),
      ).length
    );
  }, 0);

  seed[myUserId] = {
    startEnergy: stepsAverage >= 12000 ? 12 : stepsAverage >= 8000 ? 10 : stepsAverage >= 5000 ? 7 : 4,
    defenseBoost:
      sleepAverage >= 440 || (restingHeartRateAverage > 0 && restingHeartRateAverage <= 58)
        ? 2
        : sleepAverage >= 390
          ? 1
          : 0,
    scoutRangeBoost: weeklyRunSessions >= 5 || proteinAverage >= 100 ? 1 : 0,
  };

  return seed;
}

function buildTiles(participants: Participant[], mapId: StrategyMapId) {
  const tiles: StrategyTile[] = [];

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      tiles.push({
        x,
        y,
        type: "plain",
      });
    }
  }

  const outposts =
    mapId === "frontier-crossroads-8x8"
      ? [
          { x: 2, y: 2 },
          { x: 5, y: 5 },
          { x: 2, y: 5 },
          { x: 5, y: 2 },
          { x: 3, y: 3 },
        ]
      : [
          { x: 3, y: 3 },
          { x: 4, y: 4 },
          { x: 3, y: 4 },
          { x: 4, y: 3 },
        ];

  outposts.forEach((tile, index) => {
    const target = tiles.find((entry) => entry.x === tile.x && entry.y === tile.y);
    if (target) {
      target.type = index % 2 === 0 ? "outpost" : "resource";
      target.resourceType = index % 2 === 0 ? null : index === 1 ? "energy" : "material";
      target.durability = 2;
    }
  });

  participants.forEach((participant, index) => {
    const base = BASE_POSITIONS[index];
    const target = tiles.find((entry) => entry.x === base.x && entry.y === base.y);
    if (target) {
      target.type = "base";
      target.ownerUserId = participant.userId;
      target.baseOwnerUserId = participant.userId;
      target.durability = 4;
    }
  });

  return tiles;
}

function buildPlayers(
  participants: Participant[],
  bonusOverrides?: PulseFrontierBonusOverrides,
): StrategyPlayerState[] {
  return participants.map((participant, index) => {
    const bonuses = bonusOverrides?.[participant.userId] || buildDefaultHealthBonuses(participant);
    return {
      userId: participant.userId,
      name: participant.name,
      teamId: participant.teamId || (index % 2 === 0 ? "alpha" : "beta"),
      energy: 18 + (bonuses.startEnergy || 0),
      material: 12 + ((bonuses.defenseBoost || 0) >= 2 ? 2 : 0),
      score: 0,
      baseHp: 12 + ((bonuses.defenseBoost || 0) >= 2 ? 1 : 0),
      eliminated: false,
      healthBonuses: bonuses,
    };
  });
}

function buildUnits(participants: Participant[]): StrategyUnit[] {
  return participants.flatMap((participant, index) => {
    const base = BASE_POSITIONS[index];
    return [
      {
        id: `unit-${participant.userId}-guardian`,
        ownerUserId: participant.userId,
        type: "guardian",
        x: base.x,
        y: base.y,
        hp: 7,
        moved: false,
        acted: false,
      },
      {
        id: `unit-${participant.userId}-scout`,
        ownerUserId: participant.userId,
        type: "scout",
        x: Math.max(0, Math.min(7, base.x === 0 ? 1 : base.x - 1)),
        y: Math.max(0, Math.min(7, base.y === 0 ? 1 : base.y - 1)),
        hp: 4,
        moved: false,
        acted: false,
      },
    ];
  });
}

export function createPulseFrontierState(
  participants: Participant[],
  maxTurns = 12,
  mapId: StrategyMapId = "frontier-classic-8x8",
  matchup: StrategyMatchup = "1v1",
  bonusOverrides?: PulseFrontierBonusOverrides,
): StrategyGameState {
  const normalized = participants.slice(0, matchup === "2v2" ? 4 : 2);

  return {
    mapId,
    turn: 1,
    currentUserTurn: normalized[0]?.userId || "me",
    phase: "running",
    players: buildPlayers(normalized, bonusOverrides),
    tiles: buildTiles(normalized, mapId),
    units: buildUnits(normalized),
    actionLog: [
      {
        id: "seed-strategy-log",
        summary: "Pulse Frontier 로비가 준비됐습니다. 방장이 시작하면 1턴부터 진행됩니다.",
        createdAt: new Date().toISOString(),
      },
    ],
    ruleSet: {
      maxTurns,
      teamMode: normalized.length > 2,
    },
  };
}
