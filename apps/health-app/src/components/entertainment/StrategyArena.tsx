import { useMemo, useState } from "react";
import { Castle, Flag, Shield, Sword, Zap } from "lucide-react";
import { GameShell } from "@/components/entertainment/GameShell";
import type {
  StrategyGameState,
  StrategyUnitType,
} from "@/components/entertainment/strategy/strategyTypes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StrategySeasonRow } from "@/services/repositories/strategyRepository";

type Props = {
  state: StrategyGameState;
  myUserId: string;
  onClose: () => void;
  onSpawnUnit: (unitType: StrategyUnitType) => void;
  onMoveUnit: (unitId: string, x: number, y: number) => void;
  onAttackUnit: (unitId: string, targetUnitId: string) => void;
  onCaptureTile: (unitId: string, x: number, y: number) => void;
  onEndTurn: () => void;
  seasonSummary?: StrategySeasonRow | null;
};

function unitIcon(type: StrategyUnitType) {
  switch (type) {
    case "scout":
      return <Zap className="h-3.5 w-3.5" />;
    case "guardian":
      return <Shield className="h-3.5 w-3.5" />;
    case "striker":
      return <Sword className="h-3.5 w-3.5" />;
  }
}

export function StrategyArena({
  state,
  myUserId,
  onClose,
  onSpawnUnit,
  onMoveUnit,
  onAttackUnit,
  onCaptureTile,
  onEndTurn,
  seasonSummary,
}: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  const currentPlayer = state.players.find((player) => player.userId === state.currentUserTurn);
  const myPlayer = state.players.find((player) => player.userId === myUserId);
  const selectedUnit = state.units.find((unit) => unit.id === selectedUnitId) || null;
  const selectedTile = selectedTileIndex !== null ? state.tiles[selectedTileIndex] || null : null;
  const canAct = state.phase === "running" && state.currentUserTurn === myUserId;
  const winner = state.players.find((player) => player.userId === state.winnerUserId) || null;
  const mvp = [...state.players].sort((left, right) => right.score - left.score)[0] || null;

  const tiles = useMemo(
    () =>
      state.tiles.map((tile) => ({
        ...tile,
        unit: state.units.find((entry) => entry.x === tile.x && entry.y === tile.y) || null,
      })),
    [state.tiles, state.units],
  );

  const handleTileClick = (tileIndex: number) => {
    const tile = tiles[tileIndex];
    if (!tile) return;

    setSelectedTileIndex(tileIndex);

    if (tile.unit) {
      if (tile.unit.ownerUserId === myUserId && canAct) {
        setSelectedUnitId(tile.unit.id);
        return;
      }

      if (selectedUnit && canAct) {
        onAttackUnit(selectedUnit.id, tile.unit.id);
      }
      return;
    }

    if (!selectedUnit || !canAct) return;

    if (tile.x === selectedUnit.x && tile.y === selectedUnit.y) {
      onCaptureTile(selectedUnit.id, tile.x, tile.y);
      return;
    }

    onMoveUnit(selectedUnit.id, tile.x, tile.y);
  };

  return (
    <GameShell
      title="Pulse Frontier"
      subtitle="거점을 점령하고 자원을 운영해 상대 본진을 무너뜨리는 턴제 전략 게임입니다."
      onClose={onClose}
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr_0.95fr]">
        {state.phase === "finished" ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5 lg:col-span-3">
            <div className="text-sm text-muted-foreground">경기 결과</div>
            <div className="mt-1 text-2xl font-bold">
              {winner?.userId === myUserId ? "승리했습니다" : winner ? `${winner.name} 승리` : "경기 종료"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              승리 조건: {state.victoryReason === "base-capture" ? "상대 본진 점령" : "제한 턴 종료 후 점수 우세"}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">MVP</div>
                <div className="mt-1 font-semibold">{mvp?.name || "미정"}</div>
                <div className="text-sm text-muted-foreground">{mvp?.score || 0}점</div>
              </div>
              <div className="rounded-2xl bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">내 경기 점수</div>
                <div className="mt-1 font-semibold">{myPlayer?.score || 0}점</div>
              </div>
              <div className="rounded-2xl bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">시즌 성적</div>
                {seasonSummary ? (
                  <>
                    <div className="mt-1 font-semibold">{seasonSummary.rank}위 · 레이팅 {seasonSummary.rating}</div>
                    <div className="text-sm text-muted-foreground">
                      {seasonSummary.wins}승 {seasonSummary.losses}패 · 점령 점수 {seasonSummary.capturePoints}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">시즌 점수 집계 중</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">현재 턴</div>
            <div className="mt-1 text-xl font-bold">
              {state.turn} / {state.ruleSet.maxTurns}
            </div>
            <div className="mt-2 text-sm">
              진행 플레이어: <span className="font-medium">{currentPlayer?.name || "대기 중"}</span>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">플레이어 정보</div>
            <div className="space-y-3">
              {state.players.map((player) => (
                <div
                  key={player.userId}
                  className={`rounded-xl p-3 text-sm ${
                    player.userId === state.currentUserTurn ? "bg-primary/10" : "bg-muted/30"
                  }`}
                >
                  <div className="font-medium">{player.name}</div>
                  <div className="mt-1 text-muted-foreground">
                    에너지 {player.energy} · 재료 {player.material}
                  </div>
                  <div className="text-muted-foreground">
                    점수 {player.score} · 본진 체력 {player.baseHp}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {myPlayer ? (
            <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
              건강 보너스: 시작 에너지 +{myPlayer.healthBonuses?.startEnergy || 0} · 방어 +
              {myPlayer.healthBonuses?.defenseBoost || 0} · 스카우트 이동 +
              {myPlayer.healthBonuses?.scoutRangeBoost || 0}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-8 gap-1 rounded-3xl border bg-muted/15 p-3">
            {tiles.map((tile, index) => (
              <button
                key={`${tile.x}-${tile.y}`}
                type="button"
                onClick={() => handleTileClick(index)}
                className={`aspect-square rounded-xl border text-[10px] transition-colors ${
                  selectedUnit?.x === tile.x && selectedUnit?.y === tile.y ? "ring-2 ring-primary" : ""
                } ${selectedTileIndex === index ? "border-primary" : ""}`}
                style={{
                  backgroundColor: tile.baseOwnerUserId
                    ? tile.ownerUserId === tile.baseOwnerUserId
                      ? "rgba(139,92,246,0.18)"
                      : "rgba(239,68,68,0.18)"
                    : tile.type === "resource"
                      ? "rgba(34,197,94,0.16)"
                      : tile.type === "outpost"
                        ? "rgba(59,130,246,0.14)"
                        : "rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  {tile.type === "base" ? <Castle className="h-3.5 w-3.5" /> : null}
                  {tile.type === "outpost" ? <Flag className="h-3.5 w-3.5" /> : null}
                  {tile.unit ? unitIcon(tile.unit.type) : null}
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
            승리 조건: 상대 본진을 점령하면 즉시 승리합니다. 제한 턴이 끝나면 거점 보유,
            자원 누적, 적 유닛 제거, 본진 체력을 합산해 승패를 결정합니다.
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="font-semibold">선택 정보</div>
            {selectedUnit ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="font-medium">{selectedUnit.type}</div>
                <div className="text-muted-foreground">
                  위치 {selectedUnit.x + 1}, {selectedUnit.y + 1}
                </div>
                <div className="text-muted-foreground">HP {selectedUnit.hp}</div>
              </div>
            ) : selectedTile ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="font-medium">
                  타일 {selectedTile.x + 1}, {selectedTile.y + 1}
                </div>
                <div className="text-muted-foreground">유형 {selectedTile.type}</div>
                <div className="text-muted-foreground">점령자 {selectedTile.ownerUserId || "없음"}</div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">맵에서 타일이나 유닛을 선택하세요.</div>
            )}
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">행동</div>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" disabled={!canAct || !myPlayer} onClick={() => onSpawnUnit("scout")}>
                스카우트 생산
              </Button>
              <Button variant="outline" disabled={!canAct || !myPlayer} onClick={() => onSpawnUnit("guardian")}>
                가디언 생산
              </Button>
              <Button variant="outline" disabled={!canAct || !myPlayer} onClick={() => onSpawnUnit("striker")}>
                스트라이커 생산
              </Button>
              <Button disabled={!canAct} onClick={onEndTurn}>
                턴 종료
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">이벤트 로그</div>
            <ScrollArea className="h-48 pr-3">
              <div className="space-y-2">
                {state.actionLog.length === 0 ? (
                  <div className="text-sm text-muted-foreground">아직 기록이 없습니다.</div>
                ) : (
                  state.actionLog
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div key={entry.id} className="rounded-xl bg-muted/30 p-3 text-sm">
                        {entry.summary}
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
