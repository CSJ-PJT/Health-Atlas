import type { DeviceContact } from "@/lib/deviceContacts";

export interface FriendEntry {
  id: string;
  name: string;
  phone: string;
  addedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "direct" | "group";
  memberIds: string[];
  createdAt: string;
}

const FRIENDS_KEY = "social_friends";
const CHAT_ROOMS_KEY = "social_chat_rooms";
const CHAT_MESSAGES_KEY = "social_chat_messages";

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getFriends() {
  return readJson<FriendEntry[]>(FRIENDS_KEY, []);
}

export function saveFriend(contact: DeviceContact) {
  const current = getFriends();
  if (current.some((item) => item.phone === contact.phone || item.id === contact.id)) {
    return current;
  }

  const next = [
    {
      id: contact.id || `${Date.now()}`,
      name: contact.name,
      phone: contact.phone,
      addedAt: new Date().toISOString(),
    },
    ...current,
  ];

  writeJson(FRIENDS_KEY, next);
  return next;
}

export function removeFriend(friendId: string) {
  const next = getFriends().filter((friend) => friend.id !== friendId);
  writeJson(FRIENDS_KEY, next);
  return next;
}

export function getChatRooms() {
  return readJson<ChatRoom[]>(CHAT_ROOMS_KEY, []);
}

export function getChatMessages() {
  return readJson<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
}

export function getRoomMessages(roomId: string) {
  return getChatMessages()
    .filter((message) => message.roomId === roomId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

export function upsertDirectRoom(friend: FriendEntry) {
  const currentRooms = getChatRooms();
  const existing = currentRooms.find(
    (room) => room.type === "direct" && room.memberIds.length === 1 && room.memberIds[0] === friend.id,
  );

  if (existing) {
    return existing;
  }

  const room: ChatRoom = {
    id: `room-${Date.now()}`,
    name: friend.name,
    type: "direct",
    memberIds: [friend.id],
    createdAt: new Date().toISOString(),
  };

  writeJson(CHAT_ROOMS_KEY, [room, ...currentRooms]);
  return room;
}

export function createGroupRoom(name: string, memberIds: string[]) {
  const currentRooms = getChatRooms();
  const room: ChatRoom = {
    id: `room-${Date.now()}`,
    name,
    type: "group",
    memberIds,
    createdAt: new Date().toISOString(),
  };

  writeJson(CHAT_ROOMS_KEY, [room, ...currentRooms]);
  return room;
}

export function saveChatMessage(message: Omit<ChatMessage, "id" | "createdAt">) {
  const currentMessages = getChatMessages();
  const nextMessage: ChatMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  writeJson(CHAT_MESSAGES_KEY, [...currentMessages, nextMessage]);
  return nextMessage;
}

export function ensureSocialSeed() {
  const friends = getFriends();
  const rooms = getChatRooms();
  const messages = getChatMessages();

  if (friends.length > 0 || rooms.length > 0 || messages.length > 0) {
    return;
  }

  const now = new Date();
  const seedFriends: FriendEntry[] = [
    { id: "seed-1", name: "민지", phone: "01012345678", addedAt: now.toISOString() },
    { id: "seed-2", name: "서연", phone: "01087654321", addedAt: now.toISOString() },
    { id: "seed-3", name: "지훈", phone: "01055557777", addedAt: now.toISOString() },
    { id: "seed-4", name: "도윤", phone: "01011112222", addedAt: now.toISOString() },
  ];

  const directRoom: ChatRoom = {
    id: "room-seed-direct",
    name: "민지",
    type: "direct",
    memberIds: ["seed-1"],
    createdAt: now.toISOString(),
  };

  const groupRoom: ChatRoom = {
    id: "room-seed-group",
    name: "주말 러닝 모임",
    type: "group",
    memberIds: ["seed-1", "seed-2", "seed-3"],
    createdAt: now.toISOString(),
  };

  const recoveryRoom: ChatRoom = {
    id: "room-seed-recovery",
    name: "회복 체크방",
    type: "group",
    memberIds: ["seed-2", "seed-3", "seed-4"],
    createdAt: now.toISOString(),
  };

  const seedMessages: ChatMessage[] = [
    {
      id: "msg-seed-1",
      roomId: directRoom.id,
      senderId: "seed-1",
      senderName: "민지",
      content: "오늘 러닝 페이스 좋았어. 저녁에 스트레칭 같이 할래?",
      createdAt: new Date(now.getTime() - 1000 * 60 * 36).toISOString(),
    },
    {
      id: "msg-seed-2",
      roomId: groupRoom.id,
      senderId: "seed-2",
      senderName: "서연",
      content: "토요일 오전 7시에 한강 10km 어떄?",
      createdAt: new Date(now.getTime() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: "msg-seed-3",
      roomId: recoveryRoom.id,
      senderId: "seed-4",
      senderName: "도윤",
      content: "어제 장거리 뛰고 나서 HRV 어땠는지 공유해줘.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
    },
  ];

  writeJson(FRIENDS_KEY, seedFriends);
  writeJson(CHAT_ROOMS_KEY, [directRoom, groupRoom, recoveryRoom]);
  writeJson(CHAT_MESSAGES_KEY, seedMessages);
}
