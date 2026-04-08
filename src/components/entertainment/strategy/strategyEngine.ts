import type {
  StrategyAction,
  StrategyGameState,
  StrategyPlayerState,
  StrategyTile,
  StrategyUnit,
  StrategyUnitType,
} from "@/components/entertainment/strategy/strategyTypes";

function cloneState(state: StrategyGameState): StrategyGameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, healthBonuses: player.healthBonuses ? { ...player.healthBonuses } : undefined })),
    tiles: state.tiles.map((tile) => ({ ...tile })),
    units: state.units.map((unit) => ({ ...unit })),
    actionLog: state.actionLog.map((entry) => ({ ...entry })),
  };
}

function pushLog(state: StrategyGameState, summary: string) {
  state.actionLog.push({
    id: `strategy-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    summary,
    createdAt: new Date().toISOString(),
  });
}

function getPlayer(state: StrategyGameState, userId: string) {
  return state.players.find((player) => player.userId === userId);
}

function getTile(state: StrategyGameState, x: number, y: number) {
  return state.tiles.find((tile) => tile.x === x && tile.y === y);
}

function getUnit(state: StrategyGameState, unitId: string) {
  return state.units.find((unit) => unit.id === unitId);
}

function unitCost(unitType: StrategyUnitType) {
  switch (unitType) {
    case "scout":
      return { energy: 6, material: 4 };
    case "guardian":
      return { energy: 8, material: 6 };
    case "striker":
      return { energy: 10, material: 7 };
  }
}

function unitStats(unitType: StrategyUnitType) {
  switch (unitType) {
    case "scout":
      return { hp: 4, move: 2, attack: 2 };
    case "guardian":
      return { hp: 7, move: 1, attack: 2 };
    case "striker":
      return { hp: 5, move: 1, attack: 3 };
  }
}

function nextPlayer(state: StrategyGameState) {
  const alive = state.players.filter((player) => !player.eliminated);
  const currentIndex = alive.findIndex((player) => player.userId === state.currentUserTurn);
  const next = alive[(currentIndex + 1) % alive.length];
  state.currentUserTurn = next?.userId || state.currentUserTurn;
}

function collectResources(player: StrategyPlayerState, tiles: StrategyTile[]) {
  const owned = tiles.filter((tile) => tile.ownerUserId === player.userId);
  const energyGain = owned.filter((tile) => tile.resourceType === "energy").length * 3 + 4;
  const materialGain = owned.filter((tile) => tile.resourceType === "material").length * 2 + 3;
  player.energy += energyGain;
  player.material += materialGain;
  player.score += owned.length * 2 + Math.floor((player.baseHp || 0) / 3);
}

function evaluateVictory(state: StrategyGameState) {
  const activeBases = state.tiles.filter((tile) => tile.type === "base");
  const capturedBase = activeBases.find((tile) => tile.baseOwnerUserId && tile.ownerUserId && tile.baseOwnerUserId !== tile.ownerUserId);
  if (capturedBase?.ownerUserId) {
    state.phase = "finished";
    state.victoryReason = "base-capture";
    state.winnerUserId = capturedBase.ownerUserId;
    pushLog(state, `${getPlayer(state, capturedBase.ownerUserId)?.name || "플레이어"}가 상대 본진을 점령했습니다.`);
    return;
  }

  if (state.turn > state.ruleSet.maxTurns) {
    const winner = [...state.players].sort((left, right) => right.score - left.score)[0];
    state.phase = "finished";
    state.victoryReason = "score";
    state.winnerUserId = winner?.userId;
    pushLog(state, `${winner?.name || "플레이어"}가 점수 우세로 승리했습니다.`);
  }
}

export function reduceStrategyState(state: StrategyGameState, action: StrategyAction) {
  const next = cloneState(state);

  switch (action.type) {
    case "start-match":
      next.phase = "running";
      pushLog(next, "경기가 시작되었습니다.");
      return next;
    case "spawn-unit": {
      if (next.phase !== "running" || next.currentUserTurn !== action.userId) return next;
      const player = getPlayer(next, action.userId);
      const tile = getTile(next, action.x, action.y);
      if (!player || !tile || tile.baseOwnerUserId !== action.userId) return next;
      if (next.units.some((unit) => unit.x === action.x && unit.y === action.y)) return next;
      const cost = unitCost(action.unitType);
      if (player.energy < cost.energy || player.material < cost.material) return next;
      player.energy -= cost.energy;
      player.material -= cost.material;
      const stats = unitStats(action.unitType);
      next.units.push({
        id: `unit-${action.userId}-${Date.now()}`,
        ownerUserId: action.userId,
        type: action.unitType,
        x: action.x,
        y: action.y,
        hp: stats.hp,
        moved: true,
        acted: true,
      });
      player.score += 8;
      pushLog(next, `${player.name}이(가) ${action.unitType} 유닛을 생산했습니다.`);
      return next;
    }
    case "move-unit": {
      if (next.phase !== "running" || next.currentUserTurn !== action.userId) return next;
      const unit = getUnit(next, action.unitId);
      if (!unit || unit.ownerUserId !== action.userId || unit.moved) return next;
      const stats = unitStats(unit.type);
      const distance = Math.abs(unit.x - action.toX) + Math.abs(unit.y - action.toY);
      const moveAllowance = stats.move + (unit.type === "scout" ? getPlayer(next, action.userId)?.healthBonuses?.scoutRangeBoost || 0 : 0);
      if (distance > moveAllowance) return next;
      if (next.units.some((entry) => entry.id !== unit.id && entry.x === action.toX && entry.y === action.toY)) return next;
      if (!getTile(next, action.toX, action.toY)) return next;
      unit.x = action.toX;
      unit.y = action.toY;
      unit.moved = true;
      pushLog(next, `${getPlayer(next, action.userId)?.name || "플레이어"}이(가) 유닛을 이동했습니다.`);
      return next;
    }
    case "attack-unit": {
      if (next.phase !== "running" || next.currentUserTurn !== action.userId) return next;
      const unit = getUnit(next, action.unitId);
      const target = getUnit(next, action.targetUnitId);
      if (!unit || !target || unit.ownerUserId !== action.userId || unit.acted) return next;
      const distance = Math.abs(unit.x - target.x) + Math.abs(unit.y - target.y);
      if (distance > 1) return next;
      const attacker = unitStats(unit.type);
      const defender = getPlayer(next, target.ownerUserId)?.healthBonuses?.defenseBoost || 0;
      target.hp -= Math.max(1, attacker.attack - defender);
      unit.acted = true;
      if (target.hp <= 0) {
        next.units = next.units.filter((entry) => entry.id !== target.id);
        const player = getPlayer(next, action.userId);
        if (player) {
          player.score += 18;
        }
        pushLog(next, `${getPlayer(next, action.userId)?.name || "플레이어"}이(가) 적 유닛을 제거했습니다.`);
      } else {
        pushLog(next, `${getPlayer(next, action.userId)?.name || "플레이어"}이(가) 적 유닛을 공격했습니다.`);
      }
      return next;
    }
    case "capture-tile": {
      if (next.phase !== "running" || next.currentUserTurn !== action.userId) return next;
      const unit = getUnit(next, action.unitId);
      const tile = getTile(next, action.x, action.y);
      if (!unit || !tile || unit.ownerUserId !== action.userId || unit.acted) return next;
      if (unit.x !== action.x || unit.y !== action.y) return next;
      tile.ownerUserId = action.userId;
      tile.durability = Math.max(1, (tile.durability || 1) - 1);
      unit.acted = true;
      const player = getPlayer(next, action.userId);
      if (player) {
        player.score += tile.type === "base" ? 40 : tile.type === "outpost" ? 14 : 10;
      }
      if (tile.type === "base" && tile.baseOwnerUserId && tile.baseOwnerUserId !== action.userId) {
        const defender = getPlayer(next, tile.baseOwnerUserId);
        if (defender) {
          defender.baseHp = Math.max(0, defender.baseHp - 4);
        }
      }
      pushLog(next, `${getPlayer(next, action.userId)?.name || "플레이어"}이(가) 타일을 점령했습니다.`);
      evaluateVictory(next);
      return next;
    }
    case "end-turn": {
      if (next.phase !== "running" || next.currentUserTurn !== action.userId) return next;
      const player = getPlayer(next, action.userId);
      if (player) {
        collectResources(player, next.tiles);
      }
      next.units = next.units.map((unit) =>
        unit.ownerUserId === action.userId
          ? { ...unit, moved: false, acted: false }
          : unit,
      );
      next.turn += 1;
      nextPlayer(next);
      pushLog(next, `${player?.name || "플레이어"}이(가) 턴을 종료했습니다.`);
      evaluateVictory(next);
      return next;
    }
    case "surrender": {
      const player = getPlayer(next, action.userId);
      if (!player) return next;
      player.eliminated = true;
      const remaining = next.players.filter((entry) => !entry.eliminated);
      if (remaining.length === 1) {
        next.phase = "finished";
        next.victoryReason = "score";
        next.winnerUserId = remaining[0]?.userId;
      } else {
        nextPlayer(next);
      }
      pushLog(next, `${player.name}이(가) 항복했습니다.`);
      return next;
    }
    default:
      return next;
  }
}
