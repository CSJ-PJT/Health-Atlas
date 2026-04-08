import { useMemo, useState } from "react";
import { Eraser, PaintBucket, Pencil, Save, Share2, Trees } from "lucide-react";
import { sandboxObjectPalette, sandboxTerrainPalette } from "@/components/entertainment/sandbox/sandboxPalette";
import { GameShell } from "@/components/entertainment/GameShell";
import type {
  SandboxAction,
  SandboxObjectType,
  SandboxTerrain,
  SandboxWorldState,
} from "@/components/entertainment/sandbox/sandboxTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  state: SandboxWorldState;
  canEdit: boolean;
  onClose: () => void;
  onAction: (action: SandboxAction) => void;
};

export function SandboxArena({ state, canEdit, onClose, onAction }: Props) {
  const [tool, setTool] = useState<"paint" | "place" | "erase">("paint");
  const [selectedTerrain, setSelectedTerrain] = useState<SandboxTerrain>("grass");
  const [selectedObject, setSelectedObject] = useState<SandboxObjectType>("tree");
  const [shareName, setShareName] = useState("");

  const objectMap = useMemo(() => {
    const map = new Map<string, { emoji: string; label: string }>();
    sandboxObjectPalette.forEach((item) => map.set(item.type, { emoji: item.emoji, label: item.label }));
    return map;
  }, []);

  const handleTile = (x: number, y: number) => {
    if (!canEdit) return;
    const targetObject = state.objects.find((item) => item.x === x && item.y === y);

    if (tool === "erase" && targetObject) {
      onAction({ type: "remove-object", userId: state.permissions.ownerUserId, objectId: targetObject.id });
      return;
    }

    if (tool === "paint") {
      onAction({ type: "paint-tile", userId: state.permissions.ownerUserId, x, y, terrain: selectedTerrain });
      return;
    }

    onAction({
      type: "place-object",
      userId: state.permissions.ownerUserId,
      object: {
        id: `object-${Date.now()}-${x}-${y}`,
        type: selectedObject,
        x,
        y,
        ownerUserId: state.permissions.ownerUserId,
      },
    });
  };

  return (
    <GameShell
      title="FitCraft Island"
      subtitle="건강 활동으로 재료를 모아 친구와 함께 2D 섬을 꾸미는 협동 창조형 월드입니다."
      onClose={onClose}
    >
      <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Trees className="h-4 w-4 text-primary" />
              월드 정보
            </div>
            <div className="space-y-2 text-sm">
              <div>
                이름: <span className="font-medium">{state.meta.title}</span>
              </div>
              <div>
                테마: <span className="font-medium">{state.meta.theme}</span>
              </div>
              <div>좋아요 {state.meta.likes} · 방문 {state.meta.visits}</div>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">도구</div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={tool === "paint" ? "default" : "outline"} onClick={() => setTool("paint")}>
                <PaintBucket className="h-4 w-4" />
              </Button>
              <Button variant={tool === "place" ? "default" : "outline"} onClick={() => setTool("place")}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant={tool === "erase" ? "default" : "outline"} onClick={() => setTool("erase")}>
                <Eraser className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="grid gap-1 rounded-3xl border bg-muted/15 p-3"
            style={{ gridTemplateColumns: `repeat(${state.width}, minmax(0, 1fr))` }}
          >
            {state.tiles.map((tile) => {
              const object = state.objects.find((item) => item.x === tile.x && item.y === tile.y);
              const color =
                tile.terrain === "grass"
                  ? "#7cc67a"
                  : tile.terrain === "sand"
                    ? "#f2d091"
                    : tile.terrain === "water"
                      ? "#67b7f7"
                      : tile.terrain === "track"
                        ? "#f97316"
                        : "#94a3b8";

              return (
                <button
                  key={`${tile.x}-${tile.y}`}
                  type="button"
                  className="aspect-square rounded-xl border text-xs"
                  style={{ backgroundColor: `${color}55` }}
                  onClick={() => handleTile(tile.x, tile.y)}
                >
                  {object ? objectMap.get(object.type)?.emoji : ""}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
            편집 권한: {canEdit ? "이 방에서는 블록 배치와 지형 변경이 가능합니다." : "읽기 전용 월드입니다."}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">지형</div>
            <div className="grid grid-cols-2 gap-2">
              {sandboxTerrainPalette.map((entry) => (
                <Button
                  key={entry.terrain}
                  variant={selectedTerrain === entry.terrain ? "default" : "outline"}
                  onClick={() => setSelectedTerrain(entry.terrain)}
                >
                  {entry.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-semibold">장식</div>
            <div className="grid grid-cols-2 gap-2">
              {sandboxObjectPalette.map((entry) => (
                <Button
                  key={entry.type}
                  variant={selectedObject === entry.type ? "default" : "outline"}
                  onClick={() => setSelectedObject(entry.type)}
                >
                  {entry.emoji} {entry.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="font-semibold">공유</div>
            <Input value={shareName} onChange={(event) => setShareName(event.target.value)} placeholder="편집자 이름 메모" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline">
                <Share2 className="h-4 w-4" />
                공유
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4" />
                저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
