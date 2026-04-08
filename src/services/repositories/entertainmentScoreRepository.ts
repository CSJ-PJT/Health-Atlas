import {
  getStoredEntertainmentScores,
  saveStoredEntertainmentScores,
  loadEntertainmentLeaderboard,
  loadEntertainmentTopFive,
  recordEntertainmentScoreEvent,
} from "@/services/repositories/entertainmentRepository";

export const entertainmentScoreRepository = {
  getScores: getStoredEntertainmentScores,
  saveScores: saveStoredEntertainmentScores,
  loadLeaderboard: loadEntertainmentLeaderboard,
  loadTopFive: loadEntertainmentTopFive,
  recordEvent: recordEntertainmentScoreEvent,
};
