import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronsUpDown, ContactRound, MessageSquarePlus, Pencil, Send, Trash2, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const Chat = () => {
  const navigate = useNavigate();
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

  useDeviceBackNavigation("/");

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
    return roomMessages[roomMessages.length - 1]?.content || "새 대화를 시작해보세요.";
  };

  const handleLoadContacts = async () => {
    try {
      const permission = await DeviceContacts.getPermissionStatus();
      const granted = permission.granted ? permission : await DeviceContacts.requestContactsPermission();
      if (!granted.granted) {
        toast({
          title: "연락처 권한이 필요합니다",
          description: "연락처 기반 친구 추가를 사용하려면 권한을 허용해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const result = await DeviceContacts.getContacts();
      setContacts(result.contacts || []);
      toast({
        title: "연락처를 불러왔습니다",
        description: `${result.contacts?.length || 0}개의 연락처를 확인했습니다.`,
      });
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast({
        title: "연락처를 불러오지 못했습니다",
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = (contact: DeviceContact) => {
    saveFriend(contact);
    refreshSocialState();
    toast({
      title: "친구를 추가했습니다",
      description: `${contact.name}을(를) 친구 목록에 넣었습니다.`,
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
  };

  const handleUserIdAdd = async () => {
    if (!userIdQuery.trim()) {
      return;
    }

    const { data } = await supabase.from("profiles").select("user_id, nickname").eq("user_id", userIdQuery.trim()).maybeSingle();
    if (!data) {
      toast({
        title: "사용자를 찾지 못했습니다",
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
  };

  const handleCreateDirectRoom = (friendId: string) => {
    const friend = friends.find((item) => item.id === friendId);
    if (!friend) {
      return;
    }

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
        title: "그룹 채팅을 만들 수 없습니다",
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

    saveChatMessage({
      roomId: activeRoom.id,
      senderId: MY_USER_ID,
      senderName: MY_USER_NAME,
      content: draft.trim(),
    });
    setDraft("");
    refreshSocialState();
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
    if (!actionTarget) {
      return;
    }

    if (actionTarget.kind === "friend") {
      removeFriend(actionTarget.item.id);
    } else {
      deleteChatRoom(actionTarget.item.id);
    }
    refreshSocialState();
    setActionTarget(null);
  };

  const handleStartChatFromFriend = () => {
    if (!actionTarget || actionTarget.kind !== "friend") {
      return;
    }

    const room = upsertDirectRoom(actionTarget.item);
    refreshSocialState();
    setActiveRoomId(room.id);
    setListTab("rooms");
    setShowLists(true);
    setActionTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />

      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="뒤로가기">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">채팅</h1>
          </div>

          <div className="flex items-center gap-2" data-no-swipe="true">
            <Button
              variant={showLists ? "default" : "outline"}
              size="icon"
              onClick={() => setShowLists((value) => !value)}
              aria-label="목록 패널 표시 전환"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
            <Button
              variant={composePanel === "friend" ? "default" : "outline"}
              size="icon"
              onClick={() => {
                setComposePanel((current) => (current === "friend" ? "none" : "friend"));
                setShowLists(true);
                setListTab("friends");
              }}
              aria-label="친구 추가"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant={composePanel === "room" ? "default" : "outline"}
              size="icon"
              onClick={() => {
                setComposePanel((current) => (current === "room" ? "none" : "room"));
                setShowLists(true);
                setListTab("rooms");
              }}
              aria-label="대화 추가"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showLists ? (
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-2 gap-2" data-no-swipe="true">
                <Button variant={listTab === "friends" ? "default" : "outline"} onClick={() => setListTab("friends")}>
                  친구목록
                </Button>
                <Button variant={listTab === "rooms" ? "default" : "outline"} onClick={() => setListTab("rooms")}>
                  대화목록
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
                      <div className="max-h-72 space-y-3 overflow-y-auto">
                        {contacts.length === 0 ? (
                          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">불러온 연락처가 없습니다.</div>
                        ) : (
                          contacts.slice(0, 15).map((contact) => (
                            <div key={`${contact.id}-${contact.phone}`} className="flex items-center justify-between rounded-xl border p-3">
                              <div className="min-w-0">
                                <div className="font-medium">{contact.name}</div>
                                <div className="truncate text-xs text-muted-foreground">{contact.phone}</div>
                              </div>
                              <Button size="sm" onClick={() => handleAddFriend(contact)}>
                                추가
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">직접 추가</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="이름" />
                        <Input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} placeholder="전화번호" />
                        <Button onClick={handleManualAdd} className="w-full">
                          직접 추가
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">ID로 추가</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input value={userIdQuery} onChange={(event) => setUserIdQuery(event.target.value)} placeholder="user_xxx" />
                        <Button onClick={() => void handleUserIdAdd()} className="w-full">
                          사용자 ID 추가
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}

              {composePanel === "room" ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">1:1 대화 만들기</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {friends.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">먼저 친구를 추가해 주세요.</div>
                      ) : (
                        friends.slice(0, 15).map((friend) => (
                          <div key={friend.id} className="flex items-center justify-between rounded-xl border p-3">
                            <div className="min-w-0">
                              <div className="font-medium">{friend.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{friend.phone}</div>
                            </div>
                            <Button size="sm" onClick={() => handleCreateDirectRoom(friend.id)}>
                              대화 시작
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">그룹 대화 만들기</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="그룹 이름" />
                      <ScrollArea className="h-44 rounded-xl border p-3">
                        <div className="space-y-3">
                          {friends.map((friend) => (
                            <label key={friend.id} className="flex items-center gap-3 rounded-lg border p-3">
                              <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                              <div className="min-w-0">
                                <div className="font-medium">{friend.name}</div>
                                <div className="truncate text-xs text-muted-foreground">{friend.phone}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                      <Button onClick={handleCreateGroup} className="w-full">
                        그룹 만들기
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {listTab === "friends" ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">친구목록</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {friends.slice(0, 15).map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onPointerDown={() => startLongPress(friend, "friend")}
                        onPointerUp={clearLongPress}
                        onPointerLeave={clearLongPress}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setActionTarget({ kind: "friend", item: friend });
                          setRenameValue(friend.name);
                        }}
                        className="rounded-xl border p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-xs text-muted-foreground">{friend.phone}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium">대화목록</div>
                  <div className="space-y-3">
                    {rooms.slice(0, 15).map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setActiveRoomId(room.id)}
                        onPointerDown={() => startLongPress(room, "room")}
                        onPointerUp={clearLongPress}
                        onPointerLeave={clearLongPress}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setActionTarget({ kind: "room", item: room });
                          setRenameValue(room.name);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          activeRoomId === room.id ? "border-primary bg-primary/10" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold">
                            {room.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageSquarePlus className="h-4 w-4 text-primary" />}
                            {room.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{room.type === "group" ? "그룹" : "1:1"}</div>
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{getRoomPreview(room)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{activeRoom?.name || "대화목록에서 채팅방을 선택해 주세요"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRoom ? (
              <>
                <ScrollArea className="h-[52vh] rounded-2xl border bg-muted/10 p-4">
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.senderId === MY_USER_ID;
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            <div className="text-xs opacity-80">{message.senderName}</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm">{message.content}</div>
                            <div className="mt-1 text-[10px] opacity-70">
                              {new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="flex gap-2" data-no-swipe="true">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="메시지를 입력하세요"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSend}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                상단에서 목록 패널을 열고 친구나 대화를 선택해 주세요.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {actionTarget ? (
        <Card className="fixed left-3 right-3 top-24 z-[80] mx-auto max-w-md border-primary/20 shadow-xl" data-no-swipe="true">
          <CardHeader>
            <CardTitle>{actionTarget.kind === "friend" ? "친구 관리" : "대화방 관리"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="이름 변경" />
            <div className="flex flex-wrap gap-2">
              {actionTarget.kind === "friend" ? (
                <Button variant="outline" onClick={handleStartChatFromFriend}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  새 대화
                </Button>
              ) : null}
              <Button variant="outline" onClick={handleRename}>
                <Pencil className="mr-2 h-4 w-4" />
                이름 변경
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
              <Button variant="ghost" onClick={() => setActionTarget(null)}>
                닫기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default Chat;
