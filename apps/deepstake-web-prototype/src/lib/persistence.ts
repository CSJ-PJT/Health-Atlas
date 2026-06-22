import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorldState } from "./types";
import { createInitialWorld, seedSettlementBlock } from "./world";

const DATA_DIR = path.join(process.cwd(), "data");
const WORLD_FILE = path.join(DATA_DIR, "world-state.json");

export async function loadWorldState(): Promise<WorldState> {
  try {
    const raw = await readFile(WORLD_FILE, "utf8");
    return JSON.parse(raw) as WorldState;
  } catch {
    const seeded = seedSettlementBlock(createInitialWorld());
    await saveWorldState(seeded);
    return seeded;
  }
}

export async function saveWorldState(world: WorldState): Promise<WorldState> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(WORLD_FILE, JSON.stringify(world, null, 2), "utf8");
  return world;
}

export function getWorldFilePath() {
  return WORLD_FILE;
}
