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

export function getStoredChatRooms() {
  return readScopedJson<ChatRoom[]>(CHAT_ROOMS_KEY, []);
}

export function saveStoredChatRooms(rooms: ChatRoom[]) {
  writeScopedJson(CHAT_ROOMS_KEY, rooms);
  void replaceServerChatRooms(rooms);
}

export function getStoredChatMessages() {
  return readScopedJson<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
}

export function saveStoredChatMessages(messages: ChatMessage[]) {
  writeScopedJson(CHAT_MESSAGES_KEY, messages);
  void replaceServerChatMessages(messages);
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
