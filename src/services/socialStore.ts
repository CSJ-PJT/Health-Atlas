import type { DeviceContact } from "@/lib/deviceContacts";
import {
  deleteStoredChatRoom,
  deleteStoredFriend,
  getStoredChatMessages,
  getStoredChatRooms,
  getStoredFriends,
  hydrateSocialRepositoryFromServer,
  saveStoredChatMessages,
  saveStoredChatRooms,
  saveStoredFriends,
  subscribeSocialRepositoryChanges,
  upsertStoredChatMessage,
  upsertStoredChatRoom,
  upsertStoredFriend,
} from "@/services/repositories/socialRepository";

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

export function getFriends() {
  return getStoredFriends();
}

export function saveFriend(contact: DeviceContact) {
  const current = getFriends();
  if (current.some((item) => item.phone === contact.phone || item.id === contact.id)) {
    return current;
  }

  return upsertStoredFriend({
    id: contact.id || `${Date.now()}`,
    name: contact.name,
    phone: contact.phone,
    addedAt: new Date().toISOString(),
  });
}

export function renameFriend(friendId: string, name: string) {
  const updated = getFriends().find((friend) => friend.id === friendId);
  if (updated) {
    upsertStoredFriend({ ...updated, name });
    renameChatRoom(friendId, name);
  }
  return getFriends();
}

export function removeFriend(friendId: string) {
  return deleteStoredFriend(friendId);
}

export function getChatRooms() {
  return getStoredChatRooms();
}

export function renameChatRoom(roomId: string, name: string) {
  const room = getChatRooms().find((item) => item.id === roomId);
  if (!room) {
    return getChatRooms();
  }
  upsertStoredChatRoom({ ...room, name });
  return getChatRooms();
}

export function deleteChatRoom(roomId: string) {
  return deleteStoredChatRoom(roomId).rooms;
}

export function getChatMessages() {
  return getStoredChatMessages();
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

  upsertStoredChatRoom(room);
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

  upsertStoredChatRoom(room);
  return room;
}

export function saveChatMessage(message: Omit<ChatMessage, "id" | "createdAt">) {
  const nextMessage: ChatMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  upsertStoredChatMessage(nextMessage);
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
    { id: "seed-1", name: "민준", phone: "01012345678", addedAt: now.toISOString() },
    { id: "seed-2", name: "서연", phone: "01087654321", addedAt: now.toISOString() },
    { id: "seed-3", name: "지훈", phone: "01055557777", addedAt: now.toISOString() },
    { id: "seed-4", name: "유나", phone: "01011112222", addedAt: now.toISOString() },
  ];

  const directRoom: ChatRoom = {
    id: "room-seed-direct",
    name: "민준",
    type: "direct",
    memberIds: ["seed-1"],
    createdAt: now.toISOString(),
  };

  const groupRoom: ChatRoom = {
    id: "room-seed-group",
    name: "주말 러닝 크루",
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
      senderName: "민준",
      content: "오늘 러닝 페이스 좋네. 저녁에는 스트레칭 꼭 해.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 36).toISOString(),
    },
    {
      id: "msg-seed-2",
      roomId: groupRoom.id,
      senderId: "seed-2",
      senderName: "서연",
      content: "토요일 오전 7시에 한강 러닝 어때?",
      createdAt: new Date(now.getTime() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: "msg-seed-3",
      roomId: recoveryRoom.id,
      senderId: "seed-4",
      senderName: "유나",
      content: "어제 장거리 이후 HRV 흐름 공유해줘.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
    },
  ];

  saveStoredFriends(seedFriends);
  saveStoredChatRooms([directRoom, groupRoom, recoveryRoom]);
  saveStoredChatMessages(seedMessages);
}

export async function hydrateSocialStoreFromServer() {
  return hydrateSocialRepositoryFromServer();
}

export function subscribeSocialStoreChanges(onChange: () => void) {
  return subscribeSocialRepositoryChanges(onChange);
}
