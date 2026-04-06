import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";
import type { ChatMessage, ChatRoom, FriendEntry } from "@/services/socialStore";

const FRIENDS_KEY = "social_friends";
const CHAT_ROOMS_KEY = "social_chat_rooms";
const CHAT_MESSAGES_KEY = "social_chat_messages";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export function getStoredFriends() {
  return readScopedJson<FriendEntry[]>(FRIENDS_KEY, []);
}

export function saveStoredFriends(friends: FriendEntry[]) {
  writeScopedJson(FRIENDS_KEY, friends);
  void replaceServerFriends(friends);
}

export function upsertStoredFriend(friend: FriendEntry) {
  const next = [friend, ...getStoredFriends().filter((item) => item.id !== friend.id)].sort(
    (left, right) => new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime(),
  );
  writeScopedJson(FRIENDS_KEY, next);
  void upsertServerFriend(friend);
  return next;
}

export function deleteStoredFriend(friendId: string) {
  const next = getStoredFriends().filter((friend) => friend.id !== friendId);
  writeScopedJson(FRIENDS_KEY, next);
  void deleteServerFriend(friendId);
  return next;
}

export function getStoredChatRooms() {
  return readScopedJson<ChatRoom[]>(CHAT_ROOMS_KEY, []);
}

export function saveStoredChatRooms(rooms: ChatRoom[]) {
  writeScopedJson(CHAT_ROOMS_KEY, rooms);
  void replaceServerChatRooms(rooms);
}

export function upsertStoredChatRoom(room: ChatRoom) {
  const next = [room, ...getStoredChatRooms().filter((item) => item.id !== room.id)].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  writeScopedJson(CHAT_ROOMS_KEY, next);
  void upsertServerChatRoom(room);
  return next;
}

export function deleteStoredChatRoom(roomId: string) {
  const nextRooms = getStoredChatRooms().filter((room) => room.id !== roomId);
  const nextMessages = getStoredChatMessages().filter((message) => message.roomId !== roomId);
  writeScopedJson(CHAT_ROOMS_KEY, nextRooms);
  writeScopedJson(CHAT_MESSAGES_KEY, nextMessages);
  void deleteServerChatRoom(roomId);
  void deleteServerChatMessagesByRoom(roomId);
  return { rooms: nextRooms, messages: nextMessages };
}

export function getStoredChatMessages() {
  return readScopedJson<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
}

export function saveStoredChatMessages(messages: ChatMessage[]) {
  writeScopedJson(CHAT_MESSAGES_KEY, messages);
  void replaceServerChatMessages(messages);
}

export function upsertStoredChatMessage(message: ChatMessage) {
  const next = [...getStoredChatMessages().filter((item) => item.id !== message.id), message].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  writeScopedJson(CHAT_MESSAGES_KEY, next);
  void upsertServerChatMessage(message);
  return next;
}

export function deleteStoredChatMessage(messageId: string) {
  const next = getStoredChatMessages().filter((message) => message.id !== messageId);
  writeScopedJson(CHAT_MESSAGES_KEY, next);
  void deleteServerChatMessage(messageId);
  return next;
}

export async function hydrateSocialRepositoryFromServer() {
  const [friends, rooms, messages] = await Promise.all([loadServerFriends(), loadServerChatRooms(), loadServerChatMessages()]);

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

export function subscribeSocialRepositoryChanges(onChange: () => void) {
  const profileId = getProfileId();
  const roomFilter = profileId ? `profile_id=eq.${profileId}` : undefined;
  const channel = supabase
    .channel(`social-repository-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "social_friends", ...(roomFilter ? { filter: roomFilter } : {}) }, async () => {
      await hydrateSocialRepositoryFromServer();
      onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "social_chat_rooms", ...(roomFilter ? { filter: roomFilter } : {}) }, async () => {
      await hydrateSocialRepositoryFromServer();
      onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "social_chat_messages", ...(roomFilter ? { filter: roomFilter } : {}) }, async () => {
      await hydrateSocialRepositoryFromServer();
      onChange();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

async function replaceServerFriends(friends: FriendEntry[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error: deleteError } = await supabase.from("social_friends").delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("social_friends", friends);
    return false;
  }

  if (friends.length > 0) {
    const { error: insertError } = await supabase.from("social_friends").insert(
      friends.map((friend) => ({
        id: friend.id,
        profile_id: profileId,
        name: friend.name,
        phone: friend.phone,
        added_at: friend.addedAt,
        updated_at: new Date().toISOString(),
      })),
    );

    if (insertError) {
      void saveServerSnapshot("social_friends", friends);
      return false;
    }
  }

  return true;
}

async function upsertServerFriend(friend: FriendEntry) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_friends").upsert({
    id: friend.id,
    profile_id: profileId,
    name: friend.name,
    phone: friend.phone,
    added_at: friend.addedAt,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

async function deleteServerFriend(friendId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_friends").delete().eq("id", friendId).eq("profile_id", profileId);
  return !error;
}

async function replaceServerChatRooms(rooms: ChatRoom[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error: deleteError } = await supabase.from("social_chat_rooms").delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("social_chat_rooms", rooms);
    return false;
  }

  if (rooms.length > 0) {
    const { error: insertError } = await supabase.from("social_chat_rooms").insert(
      rooms.map((room) => ({
        id: room.id,
        profile_id: profileId,
        name: room.name,
        type: room.type,
        member_ids: room.memberIds,
        created_at: room.createdAt,
        updated_at: new Date().toISOString(),
      })),
    );

    if (insertError) {
      void saveServerSnapshot("social_chat_rooms", rooms);
      return false;
    }
  }

  return true;
}

async function upsertServerChatRoom(room: ChatRoom) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_chat_rooms").upsert({
    id: room.id,
    profile_id: profileId,
    name: room.name,
    type: room.type,
    member_ids: room.memberIds,
    created_at: room.createdAt,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

async function deleteServerChatRoom(roomId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_chat_rooms").delete().eq("id", roomId).eq("profile_id", profileId);
  return !error;
}

async function replaceServerChatMessages(messages: ChatMessage[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error: deleteError } = await supabase.from("social_chat_messages").delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("social_chat_messages", messages);
    return false;
  }

  if (messages.length > 0) {
    const { error: insertError } = await supabase.from("social_chat_messages").insert(
      messages.map((message) => ({
        id: message.id,
        profile_id: profileId,
        room_id: message.roomId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        content: message.content,
        created_at: message.createdAt,
      })),
    );

    if (insertError) {
      void saveServerSnapshot("social_chat_messages", messages);
      return false;
    }
  }

  return true;
}

async function upsertServerChatMessage(message: ChatMessage) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_chat_messages").upsert({
    id: message.id,
    profile_id: profileId,
    room_id: message.roomId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    content: message.content,
    created_at: message.createdAt,
  });
  return !error;
}

async function deleteServerChatMessage(messageId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_chat_messages").delete().eq("id", messageId).eq("profile_id", profileId);
  return !error;
}

async function deleteServerChatMessagesByRoom(roomId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_chat_messages").delete().eq("room_id", roomId).eq("profile_id", profileId);
  return !error;
}

async function loadServerFriends() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase.from("social_friends").select("*").eq("profile_id", profileId).order("added_at", { ascending: false });
  if (error) {
    return loadServerSnapshot<FriendEntry[]>("social_friends");
  }

  return (data || []).map(
    (row): FriendEntry => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      addedAt: row.added_at,
    }),
  );
}

async function loadServerChatRooms() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase.from("social_chat_rooms").select("*").eq("profile_id", profileId).order("created_at", { ascending: false });
  if (error) {
    return loadServerSnapshot<ChatRoom[]>("social_chat_rooms");
  }

  return (data || []).map(
    (row): ChatRoom => ({
      id: row.id,
      name: row.name,
      type: row.type as ChatRoom["type"],
      memberIds: Array.isArray(row.member_ids) ? (row.member_ids as string[]) : [],
      createdAt: row.created_at,
    }),
  );
}

async function loadServerChatMessages() {
  const profileId = getProfileId();
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase.from("social_chat_messages").select("*").eq("profile_id", profileId).order("created_at", { ascending: true });
  if (error) {
    return loadServerSnapshot<ChatMessage[]>("social_chat_messages");
  }

  return (data || []).map(
    (row): ChatMessage => ({
      id: row.id,
      roomId: row.room_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      content: row.content,
      createdAt: row.created_at,
    }),
  );
}
