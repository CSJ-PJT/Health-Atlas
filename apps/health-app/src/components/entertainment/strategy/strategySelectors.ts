import type { StrategyGameState } from "@/components/entertainment/strategy/strategyTypes";

export function getStrategyPlayer(state: StrategyGameState, userId: string) {
  return state.players.find((player) => player.userId === userId) || null;
}

export function getStrategyBaseTiles(state: StrategyGameState, userId: string) {
  return state.tiles.filter((tile) => tile.type === "base" && tile.baseOwnerUserId === userId);
}

export function getStrategyUnits(state: StrategyGameState, userId: string) {
  return state.units.filter((unit) => unit.ownerUserId === userId);
}
