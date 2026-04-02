import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ContactRound, MessageCircleMore, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const Chat = () => {
  const { toast } = useToast();
  const longPressTimer = useRef<number | null>(null);
  const [friends, setFriends] = useState(getFriends());
  const [rooms, setRooms] = useState(getChatRooms());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(getChatRooms()[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [userIdQuery, setUserIdQuery] = useState("");
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [friendsDialogOpen, setFriendsDialogOpen] = useState(false);
  const [roomsDialogOpen, setRoomsDialogOpen] = useState(false);
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const [actionTarget, setActionTarget] = useState<ChatRoom | FriendEntry | null>(null);
  const [actionType, setActionType] = useState<"room" | "friend" | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    ensureSocialSeed();
    const nextFriends = getFriends();
    const nextRooms = getChatRooms();
    setFriends(nextFriends);
    setRooms(nextRooms);
    setActiveRoomId(nextRooms[0]?.id || null);
  }, []);

  useEffect(() => {
    if (actionsCollapsed) {
      setFriendsDialogOpen(false);
      setRoomsDialogOpen(false);
    }
  }, [actionsCollapsed]);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null;
  const messages = useMemo(() => (activeRoom ? getRoomMessages(activeRoom.id) : []), [activeRoom, rooms]);

  const getRoomPreview = (room: ChatRoom) => {
    const roomMessages = getRoomMessages(room.id);
    return roomMessages[roomMessages.length - 1]?.content || "대화를 시작해 보세요.";
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (target: ChatRoom | FriendEntry, type: "room" | "friend") => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setActionTarget(target);
      setActionType(type);
      setRenameValue(target.name);
    }, 1000);
  };

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const refreshSocialState = () => {
    setFriends(getFriends());
    setRooms(getChatRooms());
  };

  const handleCreateDirectRoom = (friendId: string) => {
    const friend = friends.find((item) => item.id === friendId);
    if (!friend) return;

    const room = upsertDirectRoom(friend);
    refreshSocialState();
    setActiveRoomId(room.id);
    setRoomsDialogOpen(false);
    toast({
      title: "채팅방을 만들었습니다",
      description: `${friend.name}와 바로 대화를 시작할 수 있습니다.`,
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      toast({
        title: "그룹 채팅 생성 조건이 부족합니다",
        description: "그룹 이름과 2명 이상의 친구를 선택해 주세요.",
        variant: "destructive",
      });
      return;
    }

    const room = createGroupRoom(groupName.trim(), selectedMembers);
    refreshSocialState();
    setActiveRoomId(room.id);
    setGroupName("");
    setSelectedMembers([]);
    setRoomsDialogOpen(false);
  };

  const handleSend = () => {
    if (!activeRoom || !draft.trim()) return;

    saveChatMessage({
      roomId: activeRoom.id,
      senderId: MY_USER_ID,
      senderName: MY_USER_NAME,
      content: draft.trim(),
    });
    setDraft("");
    refreshSocialState();
  };

  const handleLoadContacts = async () => {
    try {
      const status = await DeviceContacts.getPermissionStatus();
      const granted = status.granted ? status : await DeviceContacts.requestContactsPermission();
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
      description: `${contact.name}를 친구 목록에 넣었습니다.`,
    });
  };

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualPhone.trim()) return;
    handleAddFriend({
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      phone: manualPhone.trim(),
    });
    setManualName("");
    setManualPhone("");
  };

  const handleUserIdAdd = async () => {
    if (!userIdQuery.trim()) return;

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

  const handleRename = () => {
    if (!actionTarget || !renameValue.trim() || !actionType) return;

    if (actionType === "room") {
      renameChatRoom(actionTarget.id, renameValue.trim());
    } else {
      renameFriend(actionTarget.id, renameValue.trim());
    }
    refreshSocialState();
    setActionTarget(null);
    setActionType(null);
  };

  const handleDelete = () => {
    if (!actionTarget || !actionType) return;

    if (actionType === "room") {
      const nextRooms = deleteChatRoom(actionTarget.id);
      setRooms(nextRooms);
      if (activeRoomId === actionTarget.id) {
        setActiveRoomId(nextRooms[0]?.id || null);
      }
    } else {
      setFriends(removeFriend(actionTarget.id));
    }
    setActionTarget(null);
    setActionType(null);
  };

  const handleStartChatFromFriend = () => {
    if (!actionTarget || actionType !== "friend") return;
    const room = upsertDirectRoom(actionTarget as FriendEntry);
    refreshSocialState();
    setActiveRoomId(room.id);
    setActionTarget(null);
    setActionType(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">채팅</h1>

          <div className="flex gap-2" data-no-swipe="true">
            <Button variant="outline" size="icon" onClick={() => setActionsCollapsed((value) => !value)}>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>

            <Dialog open={friendsDialogOpen} onOpenChange={setFriendsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={actionsCollapsed}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>친구 관리</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">연락처에서 추가</CardTitle>
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
                        <CardTitle className="text-base">직접 입력</CardTitle>
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
                        <CardTitle className="text-base">사용자 ID</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input value={userIdQuery} onChange={(event) => setUserIdQuery(event.target.value)} placeholder="user_xxx" />
                        <Button onClick={() => void handleUserIdAdd()} className="w-full">
                          ID로 추가
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">현재 친구 목록</div>
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
                          setActionTarget(friend);
                          setActionType("friend");
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
              </DialogContent>
            </Dialog>

            <Dialog open={roomsDialogOpen} onOpenChange={setRoomsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="bg-primary hover:bg-primary/90" disabled={actionsCollapsed}>
                  <MessageCircleMore className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>채팅 목록</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">채팅방</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rooms.slice(0, 15).map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            setActiveRoomId(room.id);
                            setRoomsDialogOpen(false);
                          }}
                          onPointerDown={() => startLongPress(room, "room")}
                          onPointerUp={clearLongPress}
                          onPointerLeave={clearLongPress}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setActionTarget(room);
                            setActionType("room");
                            setRenameValue(room.name);
                          }}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                            activeRoomId === room.id ? "border-primary bg-primary/10" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                              {room.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageCircleMore className="h-4 w-4 text-primary" />}
                              {room.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{room.type === "group" ? "그룹" : "1:1"}</div>
                          </div>
                          <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{getRoomPreview(room)}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">새 채팅 만들기</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {friends.slice(0, 15).map((friend) => (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => handleCreateDirectRoom(friend.id)}
                            className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/50"
                          >
                            <div>
                              <div className="font-medium">{friend.name}</div>
                              <div className="text-xs text-muted-foreground">{friend.phone}</div>
                            </div>
                            <MessageCircleMore className="h-4 w-4 text-primary" />
                          </button>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">그룹 채팅 만들기</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="그룹 이름" />
                        <div className="space-y-3">
                          {friends.slice(0, 15).map((friend) => (
                            <label key={friend.id} className="flex items-center gap-3 rounded-xl border p-3">
                              <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                              <div>
                                <div className="font-medium">{friend.name}</div>
                                <div className="text-xs text-muted-foreground">{friend.phone}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <Button onClick={handleCreateGroup} className="w-full">
                          그룹 채팅 생성
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="min-h-[70vh]">
          <CardHeader>
            <CardTitle>{activeRoom ? activeRoom.name : "채팅방 선택"}</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[calc(70vh-110px)] flex-col gap-4">
            <ScrollArea className="flex-1 rounded-2xl border p-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      message.senderId === MY_USER_ID ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <div className="mb-1 text-[11px] opacity-70">{message.senderName}</div>
                    <div>{message.content}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2" data-no-swipe="true">
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력해 주세요." />
              <Button onClick={handleSend}>전송</Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === "friend" ? "친구 관리" : "채팅방 관리"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="새 이름" />
              {actionType === "friend" ? (
                <Button onClick={handleStartChatFromFriend} className="w-full gap-2">
                  <MessageCircleMore className="h-4 w-4" />
                  새 대화하기
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleRename} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  이름 변경
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Chat;
