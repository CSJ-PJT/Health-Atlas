import type { SandboxAction, SandboxWorldState } from "@/components/entertainment/sandbox/sandboxTypes";

export function reduceSandboxState(state: SandboxWorldState, action: SandboxAction): SandboxWorldState {
  const next: SandboxWorldState = {
    ...state,
    version: state.version + 1,
    tiles: state.tiles.map((tile) => ({ ...tile })),
    objects: state.objects.map((object) => ({ ...object })),
    meta: { ...state.meta },
    permissions: {
      ...state.permissions,
      editorUserIds: [...state.permissions.editorUserIds],
      viewerUserIds: state.permissions.viewerUserIds ? [...state.permissions.viewerUserIds] : undefined,
    },
  };

  switch (action.type) {
    case "paint-tile":
      next.tiles = next.tiles.map((tile) =>
        tile.x === action.x && tile.y === action.y ? { ...tile, terrain: action.terrain } : tile,
      );
      return next;
    case "place-object":
      next.objects = [
        ...next.objects.filter((item) => !(item.x === action.object.x && item.y === action.object.y)),
        action.object,
      ];
      return next;
    case "remove-object":
      next.objects = next.objects.filter((item) => item.id !== action.objectId);
      return next;
    case "like-world":
      next.meta.likes += 1;
      return next;
    case "visit-world":
      next.meta.visits += 1;
      return next;
    default:
      return next;
  }
}
