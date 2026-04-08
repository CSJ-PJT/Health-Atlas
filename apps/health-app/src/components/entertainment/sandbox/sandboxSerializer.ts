import type { SandboxWorldState } from "@/components/entertainment/sandbox/sandboxTypes";

export function createFitCraftWorld(ownerUserId: string, title = "FitCraft Island"): SandboxWorldState {
  const width = 10;
  const height = 10;

  return {
    worldId: `world-${Date.now()}`,
    version: 1,
    width,
    height,
    tiles: Array.from({ length: width * height }, (_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      return {
        x,
        y,
        terrain: x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "water" : "grass",
      };
    }),
    objects: [],
    permissions: {
      ownerUserId,
      editorUserIds: [ownerUserId],
      publicEditable: false,
    },
    meta: {
      title,
      theme: "포레스트",
      likes: 0,
      visits: 0,
    },
  };
}
