import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronsUpDown, ContactRound, MessageCircleMore, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { useToast } from "@/hooks/use-toast";
import { DeviceContacts, type DeviceContact } from "@/lib/deviceContacts";
import { supabase } from "@/integrations/supabase/client";
import {
  createGroupRoom,
  deleteChatRoom,
  ensureSocialSeed,
  getChatRooms,
  getFriends,
  getRoomMessages,
  removeFriend,
  renameChatRoom,
  renameFriend,
  saveChatMessage,
  saveFriend,
  upsertDirectRoom,
  type ChatRoom,
  type FriendEntry,
} from "@/services/socialStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";

type ActionTarget =
  | { kind: "friend"; item: FriendEntry }
  | { kind: "room"; item: ChatRoom }
  | null;

type ListTab = "friends" | "rooms";
type ComposePanel = "none" | "friend" | "room";

function buildAutoReply(content: string, room: ChatRoom, friends: FriendEntry[]) {
  const normalized = content.toLowerCase();

  if (normalized.includes("안녕") || normalized.includes("hello")) {
    return "안녕하세요. 오늘 컨디션은 어떤가요?";
  }
  if (normalized.includes("러닝") || normalized.includes("거리")) {
    return "러닝 이야기 좋네요. 오늘 페이스와 회복 상태를 같이 체크해 보세요.";
  }
  if (normalized.includes("수면") || normalized.includes("잠")) {
    return "수면 흐름도 중요합니다. 어제 수면 시간과 오늘 컨디션을 같이 보면 더 정확해요.";
  }
  if (normalized.includes("심박")) {
    return "심박수는 강도 판단에 좋아요. 평소보다 높다면 회복도 같이 챙겨보세요.";
  }
  if (normalized.includes("영양") || normalized.includes("칼로리")) {
    return "영양 이야기도 좋네요. 운동 강도에 맞게 수분과 탄수화물을 함께 챙겨보세요.";
  }
  if (room.type === "group") {
    return "좋아요. 그룹 기준으로 보면 오늘 기록과 회복 흐름을 같이 비교해보는 게 좋겠습니다.";
  }

  const directFriend = friends.find((friend) => room.memberIds.includes(friend.id));
  return `${directFriend?.name || room.name} 기준으로 보면 오늘 흐름이 나쁘지 않습니다. 다음 기록도 공유해 주세요.`;
}

const Chat = () => {
  const { toast } = useToast();
  const longPressTimer = useRef<number | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [userIdQuery, setUserIdQuery] = useState("");
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [showLists, setShowLists] = useState(true);
  const [listTab, setListTab] = useState<ListTab>("rooms");
  const [composePanel, setComposePanel] = useState<ComposePanel>("none");
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [renameValue, setRenameValue] = useState("");

  useDeviceBackNavigation({
    fallback: "/",
    isRootPage: true,
    onBackWithinPage: () => {
      if (actionTarget) {
        setActionTarget(null);
        return true;
      }
      if (composePanel === "friend") {
        setComposePanel("none");
        setListTab("friends");
        return true;
      }
      if (composePanel === "room") {
        setComposePanel("none");
        setListTab("rooms");
        return true;
      }
      if (!showLists) {
        setShowLists(true);
        return true;
      }
      return false;
    },
  });

  const refreshSocialState = () => {
    const nextFriends = getFriends();
    const nextRooms = getChatRooms();
    setFriends(nextFriends);
    setRooms(nextRooms);
    setActiveRoomId((current) => {
      if (current && nextRooms.some((room) => room.id === current)) {
        return current;
      }
      return nextRooms[0]?.id ?? null;
    });
  };

  useEffect(() => {
    ensureSocialSeed();
    refreshSocialState();
  }, []);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const messages = useMemo(() => (activeRoom ? getRoomMessages(activeRoom.id) : []), [activeRoom, rooms]);
  const shouldScrollFriendsList = friends.length > 5;
  const shouldScrollRoomsList = rooms.length > 5;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (target: FriendEntry | ChatRoom, kind: "friend" | "room") => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setActionTarget({ kind, item: target as never });
      setRenameValue(target.name);
    }, 1000);
  };

  const getRoomPreview = (room: ChatRoom) => {
    const roomMessages = getRoomMessages(room.id);
    return roomMessages[roomMessages.length - 1]?.content || "대화를 시작해보세요.";
  };

  const handleLoadContacts = async () => {
    try {
      const permission = await DeviceContacts.getPermissionStatus();
      const granted = permission.granted ? permission : await DeviceContacts.requestContactsPermission();
      if (!granted.granted) {
        toast({
          title: "연락처 권한이 필요합니다.",
          description: "연락처 기반 친구 추가를 사용하려면 권한을 허용해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const result = await DeviceContacts.getContacts();
      setContacts(result.contacts || []);
      toast({
        title: "연락처를 불러왔습니다.",
        description: `${result.contacts?.length || 0}개의 연락처를 확인했습니다.`,
      });
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast({
        title: "연락처를 불러오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = (contact: DeviceContact) => {
    saveFriend(contact);
    refreshSocialState();
    toast({
      title: "친구를 추가했습니다.",
      description: `${contact.name}님을 친구 목록에 넣었습니다.`,
    });
  };

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      return;
    }
    handleAddFriend({
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      phone: manualPhone.trim(),
    });
    setManualName("");
    setManualPhone("");
    setComposePanel("none");
    setListTab("friends");
  };

  const handleUserIdAdd = async () => {
    if (!userIdQuery.trim()) {
      return;
    }

    const { data } = await supabase.from("profiles").select("user_id, nickname").eq("user_id", userIdQuery.trim()).maybeSingle();
    if (!data) {
      toast({
        title: "사용자를 찾지 못했습니다.",
        description: "입력한 ID를 다시 확인해 주세요.",
        variant: "destructive",
      });
      return;
    }

    handleAddFriend({
      id: data.user_id,
      name: data.nickname || data.user_id,
      phone: `id:${data.user_id}`,
    });
    setUserIdQuery("");
    setComposePanel("none");
    setListTab("friends");
  };

  const handleCreateDirectRoom = (friendId: string) => {
    const friend = friends.find((item) => item.id === friendId);
    if (!friend) return;

    const room = upsertDirectRoom(friend);
    refreshSocialState();
    setActiveRoomId(room.id);
    setListTab("rooms");
    setComposePanel("none");
    setShowLists(true);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      toast({
        title: "그룹 채팅을 만들 수 없습니다.",
        description: "그룹 이름과 친구 2명 이상을 선택해 주세요.",
        variant: "destructive",
      });
      return;
    }

    const room = createGroupRoom(groupName.trim(), selectedMembers);
    refreshSocialState();
    setActiveRoomId(room.id);
    setListTab("rooms");
    setComposePanel("none");
    setGroupName("");
    setSelectedMembers([]);
    setShowLists(true);
  };

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleSend = () => {
    if (!activeRoom || !draft.trim()) {
      return;
    }

    const message = draft.trim();
    saveChatMessage({
      roomId: activeRoom.id,
      senderId: MY_USER_ID,
      senderName: MY_USER_NAME,
      content: message,
    });
    setDraft("");
    refreshSocialState();

    const senderFriend = friends.find((friend) => activeRoom.memberIds.includes(friend.id));
    const responderId = activeRoom.type === "group" ? activeRoom.memberIds[0] || "group-bot" : senderFriend?.id || "chat-bot";
    const responderName = activeRoom.type === "group" ? activeRoom.name : senderFriend?.name || activeRoom.name;
    const reply = buildAutoReply(message, activeRoom, friends);

    window.setTimeout(() => {
      saveChatMessage({
        roomId: activeRoom.id,
        senderId: responderId,
        senderName: responderName,
        content: reply,
      });
      refreshSocialState();
    }, 700);
  };

  const handleRename = () => {
    if (!actionTarget || !renameValue.trim()) {
      return;
    }

    if (actionTarget.kind === "friend") {
      renameFriend(actionTarget.item.id, renameValue.trim());
    } else {
      renameChatRoom(actionTarget.item.id, renameValue.trim());
    }
    refreshSocialState();
    setActionTarget(null);
  };

  const handleDelete = () => {
    if (!actionTarget) return;

    if (actionTarget.kind === "friend") {
      removeFriend(actionTarget.item.id);
    } else {
      deleteChatRoom(actionTarget.item.id);
    }
    refreshSocialState();
    setActionTarget(null);
  };

  const handleStartChatFromFriend = () => {
    if (!actionTarget || actionTarget.kind !== "friend") return;
    const room = upsertDirectRoom(actionTarget.item);
    refreshSocialState();
    setActiveRoomId(room.id);
    setListTab("rooms");
    setShowLists(true);
    setActionTarget(null);
  };

  const renderAddBadge = (Icon: typeof ContactRound) => (
    <span className="relative">
      <Icon className="h-4 w-4" />
      <Plus className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-background text-primary" />
    </span>
  );

  const renderFriendsList = () => {
    const content = (
      <div className="space-y-3">
        {friends.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">친구가 없습니다.</div>
        ) : (
          friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => handleCreateDirectRoom(friend.id)}
              onMouseDown={() => startLongPress(friend, "friend")}
              onMouseUp={clearLongPress}
              onMouseLeave={clearLongPress}
              onTouchStart={() => startLongPress(friend, "friend")}
              onTouchEnd={clearLongPress}
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0">
                <div className="font-medium">{friend.name}</div>
                <div className="truncate text-xs text-muted-foreground">{friend.phone}</div>
              </div>
              <ContactRound className="h-4 w-4 text-primary" />
            </button>
          ))
        )}
      </div>
    );

    return shouldScrollFriendsList ? <ScrollArea className="h-72 pr-3">{content}</ScrollArea> : content;
  };

  const renderRoomsList = () => {
    const content = (
      <div className="space-y-3">
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">대화방이 없습니다.</div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setActiveRoomId(room.id)}
              onMouseDown={() => startLongPress(room, "room")}
              onMouseUp={clearLongPress}
              onMouseLeave={clearLongPress}
              onTouchStart={() => startLongPress(room, "room")}
              onTouchEnd={clearLongPress}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                activeRoomId === room.id ? "border-primary bg-primary/10" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{room.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{getRoomPreview(room)}</div>
                </div>
                {room.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageCircleMore className="h-4 w-4 text-primary" />}
              </div>
            </button>
          ))
        )}
      </div>
    );

    return shouldScrollRoomsList ? <ScrollArea className="h-72 pr-3">{content}</ScrollArea> : content;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />

      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {composePanel !== "none" ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (composePanel === "friend") {
                    setComposePanel("none");
                    setListTab("friends");
                    return;
                  }
                  setComposePanel("none");
                  setListTab("rooms");
                }}
                aria-label="뒤로가기"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <h1 className="text-3xl font-bold">채팅</h1>
          </div>

          <div className="flex items-center gap-2" data-no-swipe="true">
            <Button variant={showLists ? "default" : "outline"} size="icon" onClick={() => setShowLists((value) => !value)} aria-label="목록 접기">
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
            <Button variant={listTab === "friends" && showLists ? "default" : "outline"} size="icon" onClick={() => { setShowLists(true); setListTab("friends"); }} aria-label="친구목록">
              <ContactRound className="h-4 w-4" />
            </Button>
            <Button variant={listTab === "rooms" && showLists ? "default" : "outline"} size="icon" onClick={() => { setShowLists(true); setListTab("rooms"); }} aria-label="대화목록">
              <MessageCircleMore className="h-4 w-4" />
            </Button>
            <Button variant={composePanel === "friend" ? "default" : "outline"} size="icon" onClick={() => { setComposePanel("friend"); setShowLists(true); setListTab("friends"); }} aria-label="친구 추가">
              {renderAddBadge(ContactRound)}
            </Button>
            <Button variant={composePanel === "room" ? "default" : "outline"} size="icon" onClick={() => { setComposePanel("room"); setShowLists(true); setListTab("rooms"); }} aria-label="대화 추가">
              {renderAddBadge(MessageCircleMore)}
            </Button>
          </div>
        </div>

        {showLists ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex gap-2" data-no-swipe="true">
                <Button size="icon" variant={listTab === "friends" ? "default" : "outline"} onClick={() => setListTab("friends")} aria-label="친구목록 탭">
                  <ContactRound className="h-4 w-4" />
                </Button>
                <Button size="icon" variant={listTab === "rooms" ? "default" : "outline"} onClick={() => setListTab("rooms")} aria-label="대화목록 탭">
                  <MessageCircleMore className="h-4 w-4" />
                </Button>
              </div>

              {composePanel === "friend" ? (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">연락처에서 친구 추가</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" onClick={() => void handleLoadContacts()} className="w-full gap-2">
                        <ContactRound className="h-4 w-4" />
                        연락처 불러오기
                      </Button>
                      {(shouldScrollFriendsList || contacts.length > 5) ? (
                        <ScrollArea className="h-72 pr-3">
                          <div className="space-y-3">
                            {contacts.length === 0 ? (
                              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">불러온 연락처가 없습니다.</div>
                            ) : (
                              contacts.map((contact) => (
                                <div key={`${contact.id}-${contact.phone}`} className="flex items-center justify-between rounded-xl border p-3">
                                  <div className="min-w-0">
                                    <div className="font-medium">{contact.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">{contact.phone}</div>
                                  </div>
                                  <Button size="sm" onClick={() => handleAddFriend(contact)}>추가</Button>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="space-y-3">
                          {contacts.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">불러온 연락처가 없습니다.</div>
                          ) : (
                            contacts.map((contact) => (
                              <div key={`${contact.id}-${contact.phone}`} className="flex items-center justify-between rounded-xl border p-3">
                                <div className="min-w-0">
                                  <div className="font-medium">{contact.name}</div>
                                  <div className="truncate text-xs text-muted-foreground">{contact.phone}</div>
                                </div>
                                <Button size="sm" onClick={() => handleAddFriend(contact)}>추가</Button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">직접 추가</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="이름" />
                        <Input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} placeholder="전화번호" />
                        <Button onClick={handleManualAdd} className="w-full">친구 저장</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">사용자 ID로 추가</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input value={userIdQuery} onChange={(event) => setUserIdQuery(event.target.value)} placeholder="사용자 ID 입력" />
                        <Button variant="outline" onClick={() => void handleUserIdAdd()} className="w-full">ID로 친구 추가</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}

              {composePanel === "room" ? (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">새 대화방 만들기</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="그룹 채팅 이름" />
                    <div className="grid gap-3 md:grid-cols-2">
                      {friends.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">선택할 친구가 없습니다.</div>
                      ) : (
                        friends.map((friend) => (
                          <label key={friend.id} className="flex items-center gap-3 rounded-lg border p-3">
                            <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                            <div className="min-w-0">
                              <div className="font-medium">{friend.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{friend.phone}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <Button onClick={handleCreateGroup} className="w-full gap-2">
                      <Users className="h-4 w-4" />
                      그룹 채팅 만들기
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {composePanel === "none" ? (listTab === "friends" ? renderFriendsList() : renderRoomsList()) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{activeRoom?.name || "대화방"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">메시지가 없습니다.</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      message.senderId === MY_USER_ID ? "ml-auto max-w-[80%] bg-primary text-primary-foreground" : "max-w-[80%] bg-muted"
                    }`}
                  >
                    <div className="mb-1 text-[11px] opacity-80">{message.senderName}</div>
                    <div>{message.content}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2" data-no-swipe="true">
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력해 주세요." />
              <Button onClick={handleSend} size="icon" aria-label="전송">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {actionTarget ? (
          <Card>
            <CardHeader>
              <CardTitle>{actionTarget.kind === "friend" ? "친구 관리" : "대화방 관리"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="새 이름" />
              <div className="flex flex-wrap gap-2">
                {actionTarget.kind === "friend" ? (
                  <Button variant="outline" onClick={handleStartChatFromFriend}>새 대화</Button>
                ) : null}
                <Button variant="outline" onClick={handleRename} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  이름 변경
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default Chat;
