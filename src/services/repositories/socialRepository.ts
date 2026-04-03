import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";
import type { ChatMessage, ChatRoom, FriendEntry } from "@/services/socialStore";

const FRIENDS_KEY = "social_friends";
const CHAT_ROOMS_KEY = "social_chat_rooms";
const CHAT_MESSAGES_KEY = "social_chat_messages";

export function getStoredFriends() {
  return readScopedJson<FriendEntry[]>(FRIENDS_KEY, []);
}

export function saveStoredFriends(friends: FriendEntry[]) {
  writeScopedJson(FRIENDS_KEY, friends);
  void saveServerSnapshot("social_friends", friends);
}

export function getStoredChatRooms() {
  return readScopedJson<ChatRoom[]>(CHAT_ROOMS_KEY, []);
}

export function saveStoredChatRooms(rooms: ChatRoom[]) {
  writeScopedJson(CHAT_ROOMS_KEY, rooms);
  void saveServerSnapshot("social_chat_rooms", rooms);
}

export function getStoredChatMessages() {
  return readScopedJson<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
}

export function saveStoredChatMessages(messages: ChatMessage[]) {
  writeScopedJson(CHAT_MESSAGES_KEY, messages);
  void saveServerSnapshot("social_chat_messages", messages);
}

export async function hydrateSocialRepositoryFromServer() {
  const [friends, rooms, messages] = await Promise.all([
    loadServerSnapshot<FriendEntry[]>("social_friends"),
    loadServerSnapshot<ChatRoom[]>("social_chat_rooms"),
    loadServerSnapshot<ChatMessage[]>("social_chat_messages"),
  ]);

  let changed = false;

  if (Array.isArray(friends) && friends.length > 0) {
    writeScopedJson(FRIENDS_KEY, friends);
    changed = true;
  }

  if (Array.isArray(rooms) && rooms.length > 0) {
    writeScopedJson(CHAT_ROOMS_KEY, rooms);
    changed = true;
  }

  if (Array.isArray(messages)) {
    writeScopedJson(CHAT_MESSAGES_KEY, messages);
    changed = true;
  }

  return changed;
}
