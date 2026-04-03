import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import type { ChatMessage, ChatRoom, FriendEntry } from "@/services/socialStore";

const FRIENDS_KEY = "social_friends";
const CHAT_ROOMS_KEY = "social_chat_rooms";
const CHAT_MESSAGES_KEY = "social_chat_messages";

export function getStoredFriends() {
  return readScopedJson<FriendEntry[]>(FRIENDS_KEY, []);
}

export function saveStoredFriends(friends: FriendEntry[]) {
  writeScopedJson(FRIENDS_KEY, friends);
}

export function getStoredChatRooms() {
  return readScopedJson<ChatRoom[]>(CHAT_ROOMS_KEY, []);
}

export function saveStoredChatRooms(rooms: ChatRoom[]) {
  writeScopedJson(CHAT_ROOMS_KEY, rooms);
}

export function getStoredChatMessages() {
  return readScopedJson<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
}

export function saveStoredChatMessages(messages: ChatMessage[]) {
  writeScopedJson(CHAT_MESSAGES_KEY, messages);
}
