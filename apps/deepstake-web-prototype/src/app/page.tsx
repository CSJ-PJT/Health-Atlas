"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ChunkSummary, PlacedStructure, Rotation, StructureKind, WorldPayload } from "../lib/types";
import { STRUCTURE_CATALOG, chunkKey } from "../lib/world";

const CHUNK_RANGE = [-2, -1, 0, 1, 2];
const TILE_OPTIONS = Array.from({ length: 8 }, (_, index) => index);
const QUICK_PIECES: StructureKind[] = ["Wall", "Door", "WindowWall", "Floor", "Fence", "Gate", "RoadMarker"];

type PlaceForm = {
  pieceId: StructureKind;
  chunkX: number;
  chunkY: number;
  tileX: number;
  tileY: number;
  rotation: Rotation;
  ownerId: string;
  regionId: string;
};

const defaultForm: PlaceForm = {
  pieceId: "Wall",
  chunkX: 0,
  chunkY: 0,
  tileX: 1,
  tileY: 1,
  rotation: 0,
  ownerId: "settlement-alpha",
  regionId: "alpha-core"
};

export default function HomePage() {
  const [payload, setPayload] = useState<WorldPayload | null>(null);
  const [selectedChunk, setSelectedChunk] = useState("0,0");
  const [form, setForm] = useState<PlaceForm>(defaultForm);
  const [message, setMessage] = useState("Loading world state...");

  useEffect(() => {
    loadWorld();
  }, []);

  const selectedChunkSummary = payload?.chunks.find((chunk) => chunk.key === selectedChunk) || null;
  const selectedChunkStructures = useMemo(() => {
    if (!payload) return [];
    const [chunkX, chunkY] = selectedChunk.split(",").map(Number);
    return payload.world.structures.filter((structure) => structure.state !== "removed" && structure.chunkX === chunkX && structure.chunkY === chunkY);
  }, [payload, selectedChunk]);
  const selectedTileStructures = useMemo(
    () => selectedChunkStructures.filter((structure) => structure.tileX === form.tileX && structure.tileY === form.tileY),
    [form.tileX, form.tileY, selectedChunkStructures]
  );
  const selectedPrimaryStructure = useMemo(
    () => selectedTileStructures.find((structure) => structure.pieceId !== "Floor") ?? selectedTileStructures[0] ?? null,
    [selectedTileStructures]
  );
  const primarySettlement = payload?.settlements[0] ?? null;
  const settlementStability = payload
    ? Math.max(0, 100 - payload.diagnostics.damagedStructures * 8 - payload.diagnostics.connectivityIssues * 5 - payload.diagnostics.requirementIssues * 7)
    : 0;
  const activeChunkStatus = selectedChunkSummary
    ? `${selectedChunkSummary.structureCount} structures / ${selectedChunkSummary.dirty ? "dirty" : "clean"}`
    : "empty chunk";
  const saveLoadStatus = payload?.diagnostics.dirtyChunks ? `${payload.diagnostics.dirtyChunks} areas have unsaved changes` : "Area saved";
  const activeStructures = payload?.world.structures.filter((structure) => structure.state !== "removed") ?? [];
  const populationPlaceholder = Math.max(8, Math.round(activeStructures.filter((structure) => structure.pieceId !== "RoadMarker").length * 1.8));
  const chunkSizeTiles = payload?.world.chunkSizeTiles ?? 8;
  const selectedWorldX = form.chunkX * chunkSizeTiles + form.tileX;
  const selectedWorldY = form.chunkY * chunkSizeTiles + form.tileY;
  const visibleWorldX = useMemo(
    () => buildVisibleAxis(activeStructures.map((structure) => toWorldTile(chunkSizeTiles, structure).worldX).concat(selectedWorldX), 1, 22),
    [activeStructures, chunkSizeTiles, selectedWorldX]
  );
  const visibleWorldY = useMemo(
    () => buildVisibleAxis(activeStructures.map((structure) => toWorldTile(chunkSizeTiles, structure).worldY).concat(selectedWorldY), 1, 9),
    [activeStructures, chunkSizeTiles, selectedWorldY]
  );
  const structureStacksByWorldTile = useMemo(() => {
    const stacks = new Map<string, PlacedStructure[]>();
    for (const structure of activeStructures) {
      const { worldX, worldY } = toWorldTile(chunkSizeTiles, structure);
      const key = `${worldX},${worldY}`;
      stacks.set(key, [...(stacks.get(key) ?? []), structure]);
    }
    return stacks;
  }, [activeStructures, chunkSizeTiles]);
  const latestEvent = payload?.diagnostics.dirtyChunks
    ? "Unsaved changes are waiting. Save the area before leaving."
    : "The settlement area is saved and ready.";
  const hasSettlementVista = activeStructures.length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
      if (!payload) return;

      const pieceIndex = Number(event.key) - 1;
      if (pieceIndex >= 0 && pieceIndex < QUICK_PIECES.length) {
        updateForm("pieceId", QUICK_PIECES[pieceIndex]);
        setMessage(`Selected ${QUICK_PIECES[pieceIndex]} from hotbar slot ${pieceIndex + 1}.`);
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        postWorld({ action: "place", ...form }, `Placed ${form.pieceId} on the selected build tile.`);
      } else if (event.key.toLowerCase() === "r" && selectedPrimaryStructure) {
        event.preventDefault();
        postWorld({ action: "rotate", recordId: selectedPrimaryStructure.recordId }, `Rotated ${selectedPrimaryStructure.pieceId}.`);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedPrimaryStructure) {
        event.preventDefault();
        postWorld({ action: "remove", recordId: selectedPrimaryStructure.recordId }, `Removed ${selectedPrimaryStructure.pieceId} from the settlement.`);
      } else if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        postWorld({ action: "advance-day" }, `Advanced to day ${payload.world.worldDay + 1}. The settlement changed and may need saving.`);
      } else if (event.key === "F5") {
        event.preventDefault();
        postWorld({ action: "save", world: payload.world }, "Saved the current settlement area.");
      } else if (event.key === "F9") {
        event.preventDefault();
        loadWorld();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [form, payload, selectedPrimaryStructure]);

  async function loadWorld() {
    const response = await fetch("/api/world", { cache: "no-store" });
    const nextPayload = (await response.json()) as WorldPayload;
    setPayload(nextPayload);
    setMessage(`Loaded ${nextPayload.diagnostics.activeStructures} structures in the current area.`);
  }

  async function postWorld(body: Record<string, unknown>, nextMessage: string) {
    const response = await fetch("/api/world", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const nextPayload = (await response.json()) as WorldPayload;
    setPayload(nextPayload);
    setMessage(nextMessage);
  }

  function updateForm<K extends keyof PlaceForm>(key: K, value: PlaceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectMapTile(chunkX: number, chunkY: number, tileX: number, tileY: number) {
    const placementRegion = getPlacementRegion(payload, chunkX, chunkY, form.ownerId, form.regionId);
    setSelectedChunk(chunkKey(chunkX, chunkY));
    setForm((current) => ({
      ...current,
      chunkX,
      chunkY,
      tileX,
      tileY,
      ownerId: placementRegion.ownerId,
      regionId: placementRegion.regionId
    }));
    return placementRegion;
  }

  async function handleMapTileClick(input: {
    chunkX: number;
    chunkY: number;
    tileX: number;
    tileY: number;
    hasStructure: boolean;
  }) {
    const placementRegion = selectMapTile(input.chunkX, input.chunkY, input.tileX, input.tileY);
    if (!input.hasStructure) {
      await postWorld(
        {
          action: "place",
          ...form,
          chunkX: input.chunkX,
          chunkY: input.chunkY,
          tileX: input.tileX,
          tileY: input.tileY,
          ownerId: placementRegion.ownerId,
          regionId: placementRegion.regionId,
          settlementId: placementRegion.ownerId
        },
        `Placed ${form.pieceId} on the selected settlement tile.`
      );
    }
  }

  if (!payload) {
    return (
      <main className="shell">
        <section className="panel">
          <p>{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DeepStake Web Prototype</p>
          <h1>Settlement Construction Lab</h1>
          <p>
            Build a small settlement, tap open ground to place modules, save the area, and advance the day.
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={loadWorld}>Load Area</button>
          <button onClick={() => postWorld({ action: "save", world: payload.world }, "Saved the current settlement area.")}>Save Area</button>
          <button onClick={() => postWorld({ action: "advance-day" }, `Advanced to day ${payload.world.worldDay + 1}. The settlement changed and may need saving.`)}>Advance Day</button>
          <button onClick={() => postWorld({ action: "reset" }, "Reset to seeded settlement block.")}>Reset Seed</button>
        </div>
      </header>

      <section className="shortcut-hud" aria-label="Prototype controls">
        <span>1-7 piece hotbar</span>
        <span>P place</span>
        <span>R rotate selected</span>
        <span>Delete remove selected</span>
        <span>D advance day</span>
        <span>F5 save</span>
        <span>F9 load</span>
      </section>

      <section className="game-screen">
        <div className="settlement-stage">
          <div className="build-zone-outline build-zone-main">Build Area</div>
          <div className="build-zone-outline build-zone-growth">Expansion</div>
          <div className="stage-overlay top-left">
            <span>DeepStake Settlement</span>
            <strong>{primarySettlement?.settlementId ?? "Seeded Village"}</strong>
            <small>Day {payload.world.worldDay} / {settlementStability}% stable</small>
          </div>
          <div className="stage-overlay top-right">
            <span>Area State</span>
            <strong>{payload.diagnostics.dirtyChunks ? "Unsaved" : "Saved"}</strong>
            <small>{payload.diagnostics.dirtyChunks ? `${payload.diagnostics.saveBatchCount} area update(s) waiting` : "ready to load"}</small>
          </div>
          <div className="player-status-bar" aria-label="Settlement status">
            <span>
              Population
              <strong>{populationPlaceholder}</strong>
            </span>
            <span>
              Structures
              <strong>{payload.diagnostics.activeStructures}</strong>
            </span>
            <span>
              Area
              <strong>{payload.diagnostics.occupiedChunks} chunks</strong>
            </span>
            <span>
              State
              <strong>{payload.diagnostics.dirtyChunks ? "Unsaved changes" : "Saved"}</strong>
            </span>
          </div>
          {hasSettlementVista ? <SettlementVista /> : null}
          <div
            className="village-map"
            aria-label="Settlement map"
            style={{ "--map-columns": visibleWorldX.length } as CSSProperties}
          >
            {[...visibleWorldY].reverse().map((worldY) =>
              visibleWorldX.map((worldX) => {
                const structureStack = structureStacksByWorldTile.get(`${worldX},${worldY}`) ?? [];
                const main = structureStack.find((structure) => structure.pieceId !== "Floor") ?? structureStack[0] ?? null;
                const selected = selectedWorldX === worldX && selectedWorldY === worldY;
                const chunkX = Math.floor(worldX / payload.world.chunkSizeTiles);
                const chunkY = Math.floor(worldY / payload.world.chunkSizeTiles);
                const tileX = ((worldX % payload.world.chunkSizeTiles) + payload.world.chunkSizeTiles) % payload.world.chunkSizeTiles;
                const tileY = ((worldY % payload.world.chunkSizeTiles) + payload.world.chunkSizeTiles) % payload.world.chunkSizeTiles;
                const placeable = Boolean(findPlacementRegion(payload, chunkX, chunkY, form.ownerId));
                const showPreview = selected && !main && placeable;
                return (
                  <button
                    className={`village-tile ${main ? `piece-${main.pieceId.toLowerCase()}` : ""} ${showPreview ? `piece-${form.pieceId.toLowerCase()} preview-tile` : ""} ${selected ? "selected" : ""} ${main?.state === "damaged" ? "damaged" : ""}`}
                    key={`${worldX}-${worldY}`}
                    type="button"
                    title={main ? `${main.pieceId} / durability ${main.durability}` : showPreview ? `Preview ${form.pieceId}` : "Empty build tile"}
                    data-placeable={placeable ? "true" : "false"}
                    onClick={() => handleMapTileClick({ chunkX, chunkY, tileX, tileY, hasStructure: Boolean(main) })}
                  >
                    {main ? <StructureVisual pieceId={main.pieceId} /> : showPreview ? <StructureVisual pieceId={form.pieceId} preview /> : null}
                  </button>
                );
              })
            )}
          </div>
          <div className="stage-overlay bottom-left">
            <span>Selected Tile</span>
            <strong>{selectedPrimaryStructure ? selectedPrimaryStructure.pieceId : "Open ground"}</strong>
            <small>{selectedPrimaryStructure ? `R rotate / Delete remove` : `P place ${form.pieceId}`}</small>
          </div>
        </div>

        <aside className="player-command-panel">
          <p className="eyebrow">Player Actions</p>
          <h2>{form.pieceId} selected</h2>
          <p>{latestEvent}</p>
          <div className="last-action-card">
            <span>Last Action</span>
            <strong>{message}</strong>
          </div>
          <div className="player-goal-card">
            <span>Current Goal</span>
            <strong>Expand the settlement block</strong>
            <small>Choose a piece, tap open ground, then save the area.</small>
          </div>
          <div className="quick-palette compact-palette">
            {QUICK_PIECES.map((piece, index) => (
              <button
                className={form.pieceId === piece ? "selected-piece" : ""}
                key={piece}
                type="button"
                onClick={() => updateForm("pieceId", piece)}
                title={`Hotkey ${index + 1}: ${piece}`}
              >
                <span>{pieceGlyph(piece)}</span>
                {index + 1}
              </button>
            ))}
          </div>
          <button
            className="primary"
            onClick={() =>
              postWorld({ action: "place", ...form }, `Placed ${form.pieceId} at the selected settlement tile.`)
            }
          >
            Place on Selected Tile
          </button>
          <div className="target-actions command-actions">
            <button
              disabled={!selectedPrimaryStructure}
              onClick={() =>
                selectedPrimaryStructure &&
                postWorld({ action: "rotate", recordId: selectedPrimaryStructure.recordId }, `Rotated selected ${selectedPrimaryStructure.pieceId}.`)
              }
            >
              Rotate
            </button>
            <button
              disabled={!selectedPrimaryStructure}
              onClick={() =>
                selectedPrimaryStructure &&
                postWorld({ action: "remove", recordId: selectedPrimaryStructure.recordId }, `Removed selected ${selectedPrimaryStructure.pieceId}.`)
              }
            >
              Remove
            </button>
          </div>
          <div className="target-actions command-actions">
            <button onClick={() => postWorld({ action: "advance-day" }, `Advanced to day ${payload.world.worldDay + 1}. The settlement changed and may need saving.`)}>
              Advance Day
            </button>
            <button onClick={() => postWorld({ action: "save", world: payload.world }, "Saved the current settlement area.")}>
              Save
            </button>
          </div>
        </aside>
      </section>

      <section className="mission-strip secondary-overview">
        <article>
          <span>Day</span>
          <strong>{payload.world.worldDay}</strong>
          <small>Settlement time</small>
        </article>
        <article>
          <span>At a glance</span>
          <strong>{primarySettlement?.settlementId ?? "No settlement"}</strong>
          <small>
            {primarySettlement
              ? `${primarySettlement.structureCount} structures across ${primarySettlement.chunkCount} chunks`
              : "Seed a block to start"}
          </small>
        </article>
        <article>
          <span>Selected work tile</span>
          <strong>
            {selectedChunk} / {form.tileX},{form.tileY}
          </strong>
          <small>{selectedTileStructures.length ? `${selectedTileStructures.length} structure(s) here` : "ready for placement"}</small>
        </article>
        <article>
          <span>Save / load</span>
          <strong>{payload.diagnostics.saveBatchCount} batches</strong>
          <small>{saveLoadStatus}</small>
        </article>
        <article>
          <span>State</span>
          <strong>{settlementStability}% stable</strong>
          <small>{payload.diagnostics.damagedStructures} damaged / {payload.diagnostics.requirementIssues} requirement issues</small>
        </article>
      </section>

      <section className="stats-grid secondary-overview">
        <Stat label="Structures" value={payload.diagnostics.activeStructures} />
        <Stat label="Occupied Chunks" value={payload.diagnostics.occupiedChunks} />
        <Stat label="Occupied Tiles" value={payload.diagnostics.occupiedTiles} />
        <Stat label="Settlements" value={payload.diagnostics.settlements} />
        <Stat label="Owners" value={Object.keys(payload.diagnostics.owners).length} />
        <Stat label="Dirty Chunks" value={payload.diagnostics.dirtyChunks} />
        <Stat label="Boundary Issues" value={payload.diagnostics.boundaryViolations} />
        <Stat label="Connectivity Issues" value={payload.diagnostics.connectivityIssues} />
        <Stat label="Requirement Issues" value={payload.diagnostics.requirementIssues} />
        <Stat label="Schema" value={`v${payload.world.schemaVersion}`} />
      </section>

      <details className="technical-drawer">
        <summary>Technical construction tools and diagnostics</summary>
      <section className="layout-grid">
        <section className="panel map-panel">
          <PanelTitle title="World Map + Build Tile" description="Click a chunk, then click a tile. Green tiles contain structures; cyan is the selected build tile." />
          <div className="world-board">
            <div className="chunk-grid">
              {[...CHUNK_RANGE].reverse().map((chunkY) =>
                CHUNK_RANGE.map((chunkX) => {
                  const key = chunkKey(chunkX, chunkY);
                  const summary = payload.chunks.find((chunk) => chunk.key === key);
                  const selected = selectedChunk === key;
                  const loaded = payload.lifecycle.loadWindowChunkKeys.includes(key);
                  return (
                    <button
                      className={`chunk-cell ${loaded ? "loaded-window" : ""} ${summary ? "occupied" : ""} ${selected ? "selected" : ""}`}
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedChunk(key);
                        updateForm("chunkX", chunkX);
                        updateForm("chunkY", chunkY);
                      }}
                    >
                      <strong>{key}</strong>
                      <span>{summary ? `${summary.structureCount} records` : "empty"}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="tile-board-wrap">
              <div className="tile-board-heading">
                <strong>Chunk {selectedChunk}</strong>
                <span>{activeChunkStatus}</span>
              </div>
              <div className="tile-board">
                {[...TILE_OPTIONS].reverse().map((tileY) =>
                  TILE_OPTIONS.map((tileX) => {
                    const tileStructures = selectedChunkStructures.filter((structure) => structure.tileX === tileX && structure.tileY === tileY);
                    const selected = form.tileX === tileX && form.tileY === tileY;
                    const main = tileStructures.find((structure) => structure.pieceId !== "Floor") ?? tileStructures[0];
                    return (
                      <button
                        className={`tile-cell ${tileStructures.length ? "has-structure" : ""} ${selected ? "selected" : ""} ${main?.state === "damaged" ? "damaged" : ""}`}
                        key={`${tileX}-${tileY}`}
                        type="button"
                        title={main ? `#${main.recordId} ${main.pieceId} rot ${main.rotation}` : `Tile ${tileX},${tileY}`}
                        onClick={() => {
                          updateForm("tileX", tileX);
                          updateForm("tileY", tileY);
                        }}
                      >
                        <span>{main ? pieceGlyph(main.pieceId) : ""}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <PanelTitle title="Quick Build Controls" description="Select a piece, place it on the highlighted build tile, then rotate or remove it from the settlement." />
          <div className="quick-palette">
            {QUICK_PIECES.map((piece) => (
              <button
                className={form.pieceId === piece ? "selected-piece" : ""}
                key={piece}
                type="button"
                onClick={() => updateForm("pieceId", piece)}
                title={`Select ${piece}`}
              >
                <span>{pieceGlyph(piece)}</span>
                {piece}
              </button>
            ))}
          </div>
          <div className="selected-action-card">
            <strong>
              {form.pieceId} ready for the selected build tile
            </strong>
            <span>Rotation {form.rotation} deg / settlement {form.ownerId} / area {form.regionId}</span>
            <button
              className="primary"
              onClick={() =>
                postWorld({ action: "place", ...form }, `Placed ${form.pieceId} on the selected build tile.`)
              }
            >
              Place Selected Structure
            </button>
          </div>
          <div className={`selected-target-card ${selectedPrimaryStructure ? "active-target" : ""}`}>
            <div>
              <span>Selected tile target</span>
              <strong>
                {selectedPrimaryStructure
                  ? selectedPrimaryStructure.pieceId
                  : `Empty tile ${form.tileX},${form.tileY}`}
              </strong>
              <small>
                {selectedPrimaryStructure
                  ? `Rotation ${selectedPrimaryStructure.rotation} / durability ${selectedPrimaryStructure.durability} / state ${selectedPrimaryStructure.state}`
                  : "Place a structure here or choose another tile on the board."}
              </small>
            </div>
            <div className="target-actions">
              <button
                disabled={!selectedPrimaryStructure}
                onClick={() =>
                  selectedPrimaryStructure &&
                  postWorld({ action: "rotate", recordId: selectedPrimaryStructure.recordId }, `Rotated ${selectedPrimaryStructure.pieceId}.`)
                }
              >
                Rotate Selected
              </button>
              <button
                disabled={!selectedPrimaryStructure}
                onClick={() =>
                  selectedPrimaryStructure &&
                  postWorld({ action: "remove", recordId: selectedPrimaryStructure.recordId }, `Removed ${selectedPrimaryStructure.pieceId} from the settlement.`)
                }
              >
                Remove Selected
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Structure
              <select value={form.pieceId} onChange={(event) => updateForm("pieceId", event.target.value as StructureKind)}>
                {STRUCTURE_CATALOG.map((item) => (
                  <option key={item.pieceId} value={item.pieceId}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <NumberSelect label="Chunk X" value={form.chunkX} values={CHUNK_RANGE} onChange={(value) => updateForm("chunkX", value)} />
            <NumberSelect label="Chunk Y" value={form.chunkY} values={CHUNK_RANGE} onChange={(value) => updateForm("chunkY", value)} />
            <NumberSelect label="Tile X" value={form.tileX} values={TILE_OPTIONS} onChange={(value) => updateForm("tileX", value)} />
            <NumberSelect label="Tile Y" value={form.tileY} values={TILE_OPTIONS} onChange={(value) => updateForm("tileY", value)} />
            <label>
              Rotation
              <select value={form.rotation} onChange={(event) => updateForm("rotation", Number(event.target.value) as Rotation)}>
                {[0, 90, 180, 270].map((value) => (
                  <option key={value} value={value}>
                    {value} deg
                  </option>
                ))}
              </select>
            </label>
            <label>
              Owner
              <input value={form.ownerId} onChange={(event) => updateForm("ownerId", event.target.value)} />
            </label>
            <label>
              Region
              <input value={form.regionId} onChange={(event) => updateForm("regionId", event.target.value)} />
            </label>
          </div>
          <p className="message">{message}</p>
        </section>
      </section>

      <section className="layout-grid">
        <section className="panel">
          <PanelTitle title="Settlement View" description={`Structures grouped by selected chunk ${selectedChunk}.`} />
          <ChunkSummaryBlock summary={selectedChunkSummary} />
          <div className="record-list">
            {selectedChunkStructures.length ? (
              selectedChunkStructures.map((structure) => (
                <StructureRow
                  key={structure.recordId}
                  structure={structure}
                  onRotate={() => postWorld({ action: "rotate", recordId: structure.recordId }, `Rotated record ${structure.recordId}.`)}
                  onRemove={() => postWorld({ action: "remove", recordId: structure.recordId }, `Removed record ${structure.recordId}.`)}
                />
              ))
            ) : (
              <p className="empty">No active structures in this chunk.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <PanelTitle title="Chunk Diagnostics" description="Chunk grouping and ownership summaries for large-world validation." />
          <div className="diagnostics-grid">
            {payload.chunks.map((chunk) => (
              <button className="diagnostic-card" key={chunk.key} type="button" onClick={() => setSelectedChunk(chunk.key)}>
                <strong>Chunk {chunk.key}</strong>
                <span>Owner: {chunk.ownerId}</span>
                <span>Region: {chunk.regionId}</span>
                <span>Structures: {chunk.structureCount}</span>
                <span>Tiles: {chunk.occupiedTiles}</span>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <PanelTitle title="Settlement Diagnostics" description="Settlement-level summaries derived from chunk, ownership, road, and validation records." />
        <div className="diagnostics-grid">
          {payload.settlements.length ? (
            payload.settlements.map((settlement) => (
              <article className="diagnostic-card" key={settlement.settlementId}>
                <strong>{settlement.settlementId}</strong>
                <span>Owner: {settlement.ownerId}</span>
                <span>
                  Chunks: {settlement.chunkCount} / Structures: {settlement.structureCount}
                </span>
                <span>
                  Road chunks: {settlement.roadChunkCount} / Dirty chunks: {settlement.dirtyChunkCount}
                </span>
                <span>
                  Connectivity issues: {settlement.connectivityIssueCount} / Requirement issues: {settlement.requirementIssueCount}
                </span>
              </article>
            ))
          ) : (
            <p className="empty">No settlement metadata yet.</p>
          )}
        </div>
      </section>

      <section className="layout-grid">
        <section className="panel">
          <PanelTitle title="Ownership Foundation" description="Metadata only. No economy, permissions, or multiplayer yet." />
          <KeyValue data={payload.diagnostics.owners} />
          <div className="ownership-transfer">
            <strong>Transfer selected chunk</strong>
            <p>Selected chunk: {selectedChunk}. This updates metadata only and marks the chunk dirty.</p>
            <div className="button-row">
              {payload.world.regions.map((region) => (
                <button
                  key={region.regionId}
                  onClick={() => {
                    const [chunkX, chunkY] = selectedChunk.split(",").map(Number);
                    postWorld(
                      {
                        action: "transfer-ownership",
                        chunkX,
                        chunkY,
                        ownerId: region.ownerId,
                        regionId: region.regionId,
                        settlementId: region.ownerId
                      },
                      `Transferred chunk ${selectedChunk} to ${region.ownerId} / ${region.regionId}.`
                    );
                  }}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Structure Types" description="Current construction record mix." />
          <KeyValue data={payload.diagnostics.structureTypes} />
        </section>
      </section>

      <section className="layout-grid">
        <section className="panel">
          <PanelTitle title="Region Boundary Validation" description="Checks whether chunk ownership and region metadata are internally consistent." />
          <div className="region-grid">
            {payload.world.regions.map((region) => (
              <article className="region-card" key={region.regionId}>
                <strong>{region.label}</strong>
                <span>{region.regionId}</span>
                <span>Owner: {region.ownerId}</span>
                <span>
                  Bounds: X {region.minChunkX}..{region.maxChunkX} / Y {region.minChunkY}..{region.maxChunkY}
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Boundary Issues" description="A clean list means current construction records fit the declared ownership regions." />
          <div className="record-list">
            {payload.boundaryViolations.length ? (
              payload.boundaryViolations.map((issue) => (
                <article className="record-row warning-row" key={`${issue.key}-${issue.regionId}`}>
                  <div>
                    <strong>Chunk {issue.key}</strong>
                    <span>{issue.reason}</span>
                    <span>
                      Owner {issue.ownerId} / Region {issue.regionId} / Structures {issue.structureCount}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No boundary violations detected.</p>
            )}
          </div>
        </section>
      </section>

      <section className="layout-grid">
        <section className="panel">
          <PanelTitle title="Settlement Connectivity" description="Road/path access diagnostics for settlement-scale construction rules." />
          <div className="summary-strip">
            <span>Road chunks: {payload.diagnostics.roadNetworkChunks}</span>
            <span>Issues: {payload.diagnostics.connectivityIssues}</span>
            <span>Rule: road / gate / door adjacency</span>
            <span>Scope: metadata only</span>
          </div>
          <div className="record-list">
            {payload.connectivityIssues.length ? (
              payload.connectivityIssues.map((issue) => (
                <article className={`record-row ${issue.severity === "blocked" ? "critical-row" : "warning-row"}`} key={`${issue.recordId}-${issue.key}`}>
                  <div>
                    <strong>
                      #{issue.recordId} {issue.pieceId} / {issue.severity}
                    </strong>
                    <span>
                      chunk {issue.key} / tile {issue.tileX},{issue.tileY}
                    </span>
                    <span>{issue.reason}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No settlement connectivity issues detected.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <PanelTitle title="Build Requirement Diagnostics" description="Checks minimal structural rules before these systems move into Unity." />
          <div className="summary-strip">
            <span>Issues: {payload.diagnostics.requirementIssues}</span>
            <span>Rules: support / anchor / road</span>
            <span>Mode: validation only</span>
            <span>No economy or crafting</span>
          </div>
          <div className="record-list">
            {payload.requirementIssues.length ? (
              payload.requirementIssues.map((issue) => (
                <article className={`record-row ${issue.severity === "blocked" ? "critical-row" : "warning-row"}`} key={`${issue.recordId}-${issue.requirement}`}>
                  <div>
                    <strong>
                      #{issue.recordId} {issue.pieceId} / {issue.requirement}
                    </strong>
                    <span>
                      chunk {issue.key} / tile {issue.tileX},{issue.tileY} / {issue.severity}
                    </span>
                    <span>{issue.reason}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No build requirement issues detected.</p>
            )}
          </div>
        </section>
      </section>

      <section className="layout-grid">
        <section className="panel">
          <PanelTitle title="Chunk Save Batching" description="Dirty chunk tracking and batch preview for scalable persistence." />
          <div className="summary-strip">
            <span>Dirty chunks: {payload.diagnostics.dirtyChunks}</span>
            <span>Save batches: {payload.diagnostics.saveBatchCount}</span>
            <span>Batch size: 3 chunks</span>
            <span>Mode: JSON preview</span>
          </div>
          <div className="record-list">
            {payload.saveBatches.length ? (
              payload.saveBatches.map((batch) => (
                <article className="record-row" key={batch.batchId}>
                  <div>
                    <strong>{batch.batchId}</strong>
                    <span>Chunks: {batch.chunkKeys.join(" / ")}</span>
                    <span>Structures: {batch.structureCount} / estimated {batch.estimatedBytes} bytes</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty">No dirty chunks. Current persisted state is clean.</p>
            )}
          </div>
          <button className="primary" onClick={() => postWorld({ action: "mark-clean" }, "Marked dirty chunk set clean after simulated batch save.")}>
            Simulate Batch Save Complete
          </button>
        </section>

        <section className="panel">
          <PanelTitle title="Load / Unload Radius Simulation" description="Preview the full chunk load window and which occupied chunks stay active." />
          <div className="form-grid">
            <NumberSelect
              label="Center Chunk X"
              value={payload.lifecycle.center.chunkX}
              values={CHUNK_RANGE}
              onChange={(value) =>
                postWorld({ action: "load-simulation", chunkX: value, chunkY: payload.lifecycle.center.chunkY, radius: payload.lifecycle.radius }, `Load center moved to ${value},${payload.lifecycle.center.chunkY}.`)
              }
            />
            <NumberSelect
              label="Center Chunk Y"
              value={payload.lifecycle.center.chunkY}
              values={CHUNK_RANGE}
              onChange={(value) =>
                postWorld({ action: "load-simulation", chunkX: payload.lifecycle.center.chunkX, chunkY: value, radius: payload.lifecycle.radius }, `Load center moved to ${payload.lifecycle.center.chunkX},${value}.`)
              }
            />
            <NumberSelect
              label="Load Radius"
              value={payload.lifecycle.radius}
              values={[0, 1, 2, 3, 4]}
              onChange={(value) =>
                postWorld({ action: "load-simulation", chunkX: payload.lifecycle.center.chunkX, chunkY: payload.lifecycle.center.chunkY, radius: value }, `Load radius set to ${value}.`)
              }
            />
          </div>
          <div className="summary-strip">
            <span>Load window: {payload.lifecycle.loadWindowChunkKeys.length}</span>
            <span>Occupied loaded: {payload.lifecycle.loadedChunkKeys.length}</span>
            <span>Occupied unloaded: {payload.lifecycle.unloadedChunkKeys.length}</span>
            <span>Loaded structures: {payload.lifecycle.activeStructureCount}</span>
          </div>
          <div className="lifecycle-lists">
            <div>
              <strong>Window</strong>
              <p>{payload.lifecycle.loadWindowChunkKeys.length ? payload.lifecycle.loadWindowChunkKeys.join(" / ") : "none"}</p>
            </div>
            <div>
              <strong>Loaded</strong>
              <p>{payload.lifecycle.loadedChunkKeys.length ? payload.lifecycle.loadedChunkKeys.join(" / ") : "none"}</p>
            </div>
            <div>
              <strong>Empty Loaded Slots</strong>
              <p>{payload.lifecycle.emptyLoadedChunkKeys.length ? payload.lifecycle.emptyLoadedChunkKeys.join(" / ") : "none"}</p>
            </div>
            <div>
              <strong>Unloaded</strong>
              <p>{payload.lifecycle.unloadedChunkKeys.length ? payload.lifecycle.unloadedChunkKeys.join(" / ") : "none"}</p>
            </div>
          </div>
        </section>
      </section>

      <section className="panel">
        <PanelTitle title="Architecture Notes" description="Phase 1 scope and migration intent." />
        <ul className="notes">
          <li>Unity remains the final game client. This web prototype validates systems before Unity implementation.</li>
          <li>JSON persistence is intentionally simple and can migrate to PostgreSQL/Supabase later.</li>
          <li>Records preserve Unity-oriented fields: recordId, pieceId, chunk, tile, rotation, state, durability, footprint, owner metadata.</li>
          <li>Forbidden systems are intentionally absent: combat, NPC AI, quests, economy, multiplayer, authentication, and visual polish.</li>
        </ul>
      </section>
      </details>
    </main>
  );
}

function PanelTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberSelect({ label, value, values, onChange }: { label: string; value: number; values: number[]; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChunkSummaryBlock({ summary }: { summary: ChunkSummary | null }) {
  if (!summary) return <p className="empty">Selected chunk has no active structures.</p>;
  return (
    <div className="summary-strip">
      <span>Owner: {summary.ownerId}</span>
      <span>Region: {summary.regionId}</span>
      <span>Structures: {summary.structureCount}</span>
      <span>Tiles: {summary.occupiedTiles}</span>
    </div>
  );
}

function StructureRow({ structure, onRotate, onRemove }: { structure: PlacedStructure; onRotate: () => void; onRemove: () => void }) {
  return (
    <article className="record-row">
      <div>
        <strong>
          #{structure.recordId} {structure.pieceId}
        </strong>
        <span>
          chunk {structure.chunkX},{structure.chunkY} / tile {structure.tileX},{structure.tileY} / rot {structure.rotation}
        </span>
        <span>
          owner {structure.ownership.ownerId} / durability {structure.durability}
        </span>
      </div>
      <div className="row-actions">
        <button onClick={onRotate}>Rotate</button>
        <button onClick={onRemove}>Remove</button>
      </div>
    </article>
  );
}

function SettlementVista() {
  return (
    <div className="settlement-vista" aria-hidden="true">
      <div className="vista-yard vista-yard-core" />
      <div className="vista-yard vista-yard-work" />
      <div className="vista-path vista-path-main" />
      <div className="vista-path vista-path-branch" />
      <div className="vista-scale-line">
        <i />
        <i />
        <i />
      </div>
      <div className="vista-house vista-house-a">
        <i />
        <b />
        <span />
      </div>
      <div className="vista-house vista-house-b">
        <i />
        <b />
        <span />
      </div>
      <div className="vista-house vista-shed">
        <i />
        <b />
        <span />
      </div>
      <div className="vista-fence vista-fence-left" />
      <div className="vista-fence vista-fence-right" />
      <div className="vista-gate" />
      <div className="vista-construction-frame">
        <i />
        <b />
        <span />
      </div>
      <div className="vista-crates">
        <i />
        <b />
        <span />
      </div>
      <div className="vista-player">
        <i />
        <b />
      </div>
    </div>
  );
}

function StructureVisual({ pieceId, preview = false }: { pieceId: StructureKind; preview?: boolean }) {
  return (
    <span className={`piece-model ${preview ? "preview-model" : ""}`} aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

function KeyValue({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className="empty">No records yet.</p>;
  return (
    <div className="key-value">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function pieceGlyph(pieceId: StructureKind) {
  const glyphs: Record<StructureKind, string> = {
    Floor: "F",
    Wall: "W",
    Door: "D",
    WindowWall: "O",
    Fence: "|",
    Gate: "G",
    RoadMarker: "R"
  };
  return glyphs[pieceId];
}

function toWorldTile(chunkSizeTiles: number, structure: Pick<PlacedStructure, "chunkX" | "chunkY" | "tileX" | "tileY">) {
  return {
    worldX: structure.chunkX * chunkSizeTiles + structure.tileX,
    worldY: structure.chunkY * chunkSizeTiles + structure.tileY
  };
}

function buildVisibleAxis(values: number[], padding: number, maxLength: number) {
  const usableValues = values.length ? values : [0];
  let min = Math.min(...usableValues) - padding;
  let max = Math.max(...usableValues) + padding;
  const length = max - min + 1;
  if (length > maxLength) {
    const center = Math.round((min + max) / 2);
    min = center - Math.floor(maxLength / 2);
    max = min + maxLength - 1;
  }
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function getPlacementRegion(
  payload: WorldPayload | null,
  chunkX: number,
  chunkY: number,
  fallbackOwnerId: string,
  fallbackRegionId: string
) {
  const region = findPlacementRegion(payload, chunkX, chunkY, fallbackOwnerId);
  return {
    ownerId: region?.ownerId ?? fallbackOwnerId,
    regionId: region?.regionId ?? fallbackRegionId
  };
}

function findPlacementRegion(payload: WorldPayload | null, chunkX: number, chunkY: number, preferredOwnerId?: string) {
  const regions =
    payload?.world.regions.filter(
      (item) =>
        chunkX >= item.minChunkX &&
        chunkX <= item.maxChunkX &&
        chunkY >= item.minChunkY &&
        chunkY <= item.maxChunkY
    ) ?? [];
  return regions.find((item) => item.ownerId === preferredOwnerId) ?? regions[0] ?? null;
}
