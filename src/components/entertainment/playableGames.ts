export type PlayableGameId =
  | "tap-sprint"
  | "reaction-grid"
  | "pace-memory"
  | "resource-rush"
  | "pulse-frontier"
  | "fitcraft-island"
  | "tetris";

export type RoomMode = "arcade" | "strategy" | "sandbox";

export function supportsTimedRounds(gameId: PlayableGameId) {
  return gameId === "tap-sprint" || gameId === "reaction-grid" || gameId === "pace-memory";
}

export function getGameMode(gameId: PlayableGameId): RoomMode {
  if (gameId === "pulse-frontier") {
    return "strategy";
  }

  if (gameId === "fitcraft-island") {
    return "sandbox";
  }

  return "arcade";
}
