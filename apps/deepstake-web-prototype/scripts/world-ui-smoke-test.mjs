import { chromium } from "playwright";

const baseUrl = process.env.DEEPSTAKE_WEB_BASE_URL || "http://127.0.0.1:3090";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`${init?.method || "GET"} ${path} failed with ${response.status}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

await request("/api/world", {
  method: "POST",
  body: JSON.stringify({ action: "reset" })
});

const before = await request("/api/world");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector(".game-screen", { timeout: 90_000 });

  const mapTiles = await page.locator(".village-tile").count();
  const structureModels = await page.locator(".village-tile .piece-model").count();
  const vistaHouses = await page.locator(".vista-house").count();
  const statusCards = await page.locator(".player-status-bar span").count();
  const previewModels = await page.locator(".village-tile.selected .preview-model").count();
  const lastActionCards = await page.locator(".last-action-card").count();
  const pageText = await page.locator("body").innerText();

  assert(mapTiles > 0, "settlement map should render clickable tiles");
  assert(structureModels > 0, "settlement map should render spatial structures");
  assert(vistaHouses >= 2, "playable slice should show recognizable settlement houses");
  assert(statusCards >= 4, "player-facing settlement status should render");
  assert(previewModels >= 1, "selected empty build tile should show a structure preview ghost");
  assert(lastActionCards >= 1, "player-facing last action feedback should render");
  assert(pageText.includes("Current Goal"), "player-facing current goal should render");
  assert(pageText.includes("Expand the settlement block"), "settlement objective should be visible");
  assert(pageText.includes("Load Area"), "load action should use player-facing area language");
  assert(pageText.includes("Save Area"), "save action should use player-facing area language");
  assert(!pageText.includes("Load JSON"), "primary screen should not expose Load JSON wording");
  assert(!pageText.includes("Save JSON"), "primary screen should not expose Save JSON wording");

  const emptyTile = page.locator(".village-tile[data-placeable='true'][title='Empty build tile']").first();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/world") && response.request().method() === "POST", { timeout: 90_000 }),
    emptyTile.click()
  ]);

  const afterPlace = await request("/api/world");
  assert(afterPlace.diagnostics.activeStructures === before.diagnostics.activeStructures + 1, "clicking an empty tile should place the selected structure");
  assert(afterPlace.diagnostics.dirtyChunks > 0, "placing from the map should mark chunks dirty");

  await page.getByRole("button", { name: "Rotate" }).waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Rotate" && !button.disabled),
    null,
    { timeout: 90_000 }
  );
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/world") && response.request().method() === "POST", { timeout: 90_000 }),
    page.getByRole("button", { name: "Rotate" }).click()
  ]);
  const afterRotate = await request("/api/world");
  assert(afterRotate.world.structures.some((structure) => structure.rotation === 90), "rotate action should update a placed structure");

  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Remove" && !button.disabled),
    null,
    { timeout: 90_000 }
  );
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/world") && response.request().method() === "POST", { timeout: 90_000 }),
    page.getByRole("button", { name: "Remove" }).click()
  ]);
  const afterRemove = await request("/api/world");
  assert(afterRemove.diagnostics.activeStructures === before.diagnostics.activeStructures, "remove action should remove the placed structure");

  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/world") && response.request().method() === "POST", { timeout: 90_000 }),
    page.getByRole("button", { name: "Advance Day" }).first().click()
  ]);
  const afterDay = await request("/api/world");
  assert(afterDay.world.worldDay === before.world.worldDay + 1, "advance day should update the player-facing day counter");
  assert(afterDay.diagnostics.dirtyChunks > 0, "advance day should keep unsaved area feedback connected to dirty chunks");

  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/world") && response.request().method() === "POST", { timeout: 90_000 }),
    page.getByRole("button", { name: "Save Area" }).click()
  ]);
  const afterSave = await request("/api/world");
  assert(afterSave.diagnostics.dirtyChunks === 0, "save area should clear dirty chunk feedback");
  await page.waitForFunction(() => document.body.innerText.includes("Saved"), null, { timeout: 90_000 });

  console.log(
    JSON.stringify(
      {
        status: "passed",
        baseUrl,
        mapTiles,
        structureModels,
        vistaHouses,
        statusCards,
        activeStructures: afterRemove.diagnostics.activeStructures,
        dirtyChunksAfterDay: afterDay.diagnostics.dirtyChunks,
        dirtyChunksAfterSave: afterSave.diagnostics.dirtyChunks,
        worldDay: afterDay.world.worldDay
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
