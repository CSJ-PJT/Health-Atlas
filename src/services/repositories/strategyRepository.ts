import type { StrategyGameState } from "@/components/entertainment/strategy/strategyTypes";

export function buildStrategySnapshot(state: StrategyGameState) {
  return {
    version: state.turn,
    state,
    savedAt: new Date().toISOString(),
  };
}
