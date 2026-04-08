export type SandboxTerrain = "grass" | "sand" | "water" | "track" | "stone";

export type SandboxTile = {
  x: number;
  y: number;
  terrain: SandboxTerrain;
};

export type SandboxObjectType =
  | "tree"
  | "bench"
  | "lamp"
  | "flower"
  | "track-gate"
  | "wall"
  | "floor"
  | "tower"
  | "sign";

export type SandboxObject = {
  id: string;
  type: SandboxObjectType;
  x: number;
  y: number;
  rotation?: number;
  color?: string;
  ownerUserId?: string;
};

export type SandboxWorldState = {
  worldId: string;
  version: number;
  width: number;
  height: number;
  tiles: SandboxTile[];
  objects: SandboxObject[];
  permissions: {
    ownerUserId: string;
    editorUserIds: string[];
    viewerUserIds?: string[];
    publicEditable: boolean;
  };
  meta: {
    title: string;
    theme: string;
    likes: number;
    visits: number;
  };
};

export type SandboxAction =
  | { type: "place-object"; userId: string; object: SandboxObject }
  | { type: "remove-object"; userId: string; objectId: string }
  | { type: "paint-tile"; userId: string; x: number; y: number; terrain: SandboxTerrain }
  | { type: "like-world"; userId: string }
  | { type: "visit-world"; userId: string };
