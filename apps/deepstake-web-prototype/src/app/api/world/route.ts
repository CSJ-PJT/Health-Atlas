import { NextResponse } from "next/server";
import { loadWorldState, saveWorldState } from "../../../lib/persistence";
import {
  buildWorldPayload,
  createInitialWorld,
  advanceWorldDay,
  markAllChunksClean,
  placeStructure,
  removeStructure,
  rotateStructure,
  seedSettlementBlock,
  transferChunkOwnership,
  updateLoadSimulation
} from "../../../lib/world";
import type { Rotation, StructureKind, WorldState } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const world = await loadWorldState();
  return NextResponse.json(buildWorldPayload(world));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    world?: WorldState;
    recordId?: number;
    pieceId?: StructureKind;
    chunkX?: number;
    chunkY?: number;
    tileX?: number;
    tileY?: number;
    rotation?: Rotation;
    ownerId?: string;
    regionId?: string;
    settlementId?: string;
    radius?: number;
  };

  let world = await loadWorldState();

  if (body.action === "save" && body.world) {
    world = markAllChunksClean(body.world);
  } else if (body.action === "reset") {
    world = seedSettlementBlock(createInitialWorld());
  } else if (body.action === "advance-day") {
    world = advanceWorldDay(world);
  } else if (body.action === "mark-clean") {
    world = markAllChunksClean(world);
  } else if (body.action === "load-simulation") {
    world = updateLoadSimulation(
      world,
      {
        chunkX: body.chunkX ?? world.loadCenter?.chunkX ?? 0,
        chunkY: body.chunkY ?? world.loadCenter?.chunkY ?? 0
      },
      body.radius ?? world.loadRadius ?? 1
    );
  } else if (body.action === "transfer-ownership") {
    world = transferChunkOwnership(
      world,
      body.chunkX ?? 0,
      body.chunkY ?? 0,
      body.ownerId ?? "settlement-alpha",
      body.regionId ?? "alpha-core",
      body.settlementId
    );
  } else if (body.action === "place" && body.pieceId != null) {
    world = placeStructure(world, {
      pieceId: body.pieceId,
      chunkX: body.chunkX ?? 0,
      chunkY: body.chunkY ?? 0,
      tileX: body.tileX ?? 0,
      tileY: body.tileY ?? 0,
      rotation: body.rotation ?? 0,
      ownerId: body.ownerId ?? "settlement-alpha",
      regionId: body.regionId ?? "alpha-core",
      settlementId: body.settlementId
    });
  } else if (body.action === "remove" && typeof body.recordId === "number") {
    world = removeStructure(world, body.recordId);
  } else if (body.action === "rotate" && typeof body.recordId === "number") {
    world = rotateStructure(world, body.recordId);
  }

  await saveWorldState(world);
  return NextResponse.json(buildWorldPayload(world));
}
