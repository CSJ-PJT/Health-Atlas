import {
  getStoredEntertainmentRooms,
  saveStoredEntertainmentRooms,
  hydrateEntertainmentRepositoryFromServer,
  subscribeEntertainmentRepositoryChanges,
} from "@/services/repositories/entertainmentRepository";

export const entertainmentRoomRepository = {
  list: getStoredEntertainmentRooms,
  saveAll: saveStoredEntertainmentRooms,
  hydrate: hydrateEntertainmentRepositoryFromServer,
  subscribe: subscribeEntertainmentRepositoryChanges,
};
