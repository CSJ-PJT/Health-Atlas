export type StrategyTileType = "plain" | "base" | "outpost" | "resource";
export type StrategyResourceType = "energy" | "material" | null;
export type StrategyUnitType = "scout" | "guardian" | "striker";
export type StrategyPhase = "lobby" | "running" | "finished";

export type StrategyTile = {
  x: number;
  y: number;
  type: StrategyTileType;
  ownerUserId?: string;
  baseOwnerUserId?: string;
  resourceType?: StrategyResourceType;
  durability?: number;
};

export type StrategyUnit = {
  id: string;
  ownerUserId: string;
  type: StrategyUnitType;
  x: number;
  y: number;
  hp: number;
  moved: boolean;
  acted: boolean;
};

export type StrategyHealthBonuses = {
  startEnergy?: number;
  defenseBoost?: number;
  scoutRangeBoost?: number;
};

export type StrategyPlayerState = {
  userId: string;
  name: string;
  teamId?: string;
  energy: number;
  material: number;
  score: number;
  baseHp: number;
  eliminated: boolean;
  healthBonuses?: StrategyHealthBonuses;
};

export type StrategyRuleSet = {
  maxTurns: number;
  teamMode: boolean;
};

export type StrategyGameState = {
  mapId: string;
  turn: number;
  currentUserTurn: string;
  phase: StrategyPhase;
  players: StrategyPlayerState[];
  tiles: StrategyTile[];
  units: StrategyUnit[];
  actionLog: Array<{ id: string; summary: string; createdAt: string }>;
  winnerUserId?: string;
  victoryReason?: "base-capture" | "score";
  ruleSet: StrategyRuleSet;
};

export type StrategyAction =
  | { type: "start-match"; startedBy: string }
  | { type: "spawn-unit"; userId: string; unitType: StrategyUnitType; x: number; y: number }
  | { type: "move-unit"; userId: string; unitId: string; toX: number; toY: number }
  | { type: "attack-unit"; userId: string; unitId: string; targetUnitId: string }
  | { type: "capture-tile"; userId: string; unitId: string; x: number; y: number }
  | { type: "end-turn"; userId: string }
  | { type: "surrender"; userId: string };
