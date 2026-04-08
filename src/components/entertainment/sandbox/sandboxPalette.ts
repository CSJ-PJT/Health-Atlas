import type { SandboxObjectType, SandboxTerrain } from "@/components/entertainment/sandbox/sandboxTypes";

export const sandboxTerrainPalette: Array<{ label: string; terrain: SandboxTerrain }> = [
  { label: "잔디", terrain: "grass" },
  { label: "모래", terrain: "sand" },
  { label: "물", terrain: "water" },
  { label: "트랙", terrain: "track" },
  { label: "석재", terrain: "stone" },
];

export const sandboxObjectPalette: Array<{ label: string; type: SandboxObjectType; emoji: string }> = [
  { label: "나무", type: "tree", emoji: "🌲" },
  { label: "벤치", type: "bench", emoji: "🪑" },
  { label: "램프", type: "lamp", emoji: "💡" },
  { label: "꽃", type: "flower", emoji: "🌼" },
  { label: "트랙 게이트", type: "track-gate", emoji: "🏁" },
  { label: "벽", type: "wall", emoji: "🧱" },
  { label: "바닥", type: "floor", emoji: "🟫" },
  { label: "타워", type: "tower", emoji: "🗼" },
  { label: "표지판", type: "sign", emoji: "🪧" },
];
