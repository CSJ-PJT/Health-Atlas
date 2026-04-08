import type { StrategyAction } from "@/components/entertainment/strategy/strategyTypes";

export function describeStrategyAction(action: StrategyAction) {
  switch (action.type) {
    case "start-match":
      return "경기 시작";
    case "spawn-unit":
      return `${action.unitType} 생산`;
    case "move-unit":
      return "유닛 이동";
    case "attack-unit":
      return "유닛 공격";
    case "capture-tile":
      return "타일 점령";
    case "end-turn":
      return "턴 종료";
    case "surrender":
      return "항복";
  }
}
