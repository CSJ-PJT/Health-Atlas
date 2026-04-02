import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, MessageCircleMore, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  createGroupRoom,
  deleteChatRoom,
  ensureSocialSeed,
  getChatRooms,
  getFriends,
  getRoomMessages,
  renameChatRoom,
  saveChatMessage,
  upsertDirectRoom,
  type ChatRoom,
} from "@/services/socialStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "나";

const Chat = () => {
  const { toast } = useToast();
  const longPressTimer = useRef<number | null>(null);
  const [friends, setFriends] = useState(getFriends());
  const [rooms, setRooms] = useState(getChatRooms());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(getChatRooms()[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [directDialogOpen, setDirectDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [compressed, setCompressed] = useState(false);
  const [actionTarget, setActionTarget] = useState<ChatRoom | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    ensureSocialSeed();
    const nextFriends = getFriends();
    const nextRooms = getChatRooms();
    setFriends(nextFriends);
    setRooms(nextRooms);
    setActiveRoomId(nextRooms[0]?.id || null);
  }, []);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null;
  const messages = useMemo(() => (activeRoom ? getRoomMessages(activeRoom.id) : []), [activeRoom, rooms]);

  const getRoomPreview = (room: ChatRoom) => {
    const roomMessages = getRoomMessages(room.id);
    return roomMessages[roomMessages.length - 1]?.content || "새 대화를 시작해 보세요.";
  };

  const startLongPress = (room: ChatRoom) => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setActionTarget(room);
      setRenameValue(room.name);
    }, 1000);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreateDirectRoom = (friendId: string) => {
    const friend = friends.find((item) => item.id === friendId);
    if (!friend) {
      return;
    }

    const room = upsertDirectRoom(friend);
    const nextRooms = getChatRooms();
    setRooms(nextRooms);
    setActiveRoomId(room.id);
    setDirectDialogOpen(false);
    toast({
      title: "채팅방을 만들었습니다",
      description: `${friend.name}님과 바로 대화를 시작할 수 있습니다.`,
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
    setRooms(getChatRooms());
    setActiveRoomId(room.id);
    setGroupName("");
    setSelectedMembers([]);
    setGroupDialogOpen(false);
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
    setRooms(getChatRooms());
  };

  const handleRename = () => {
    if (!actionTarget || !renameValue.trim()) {
      return;
    }
    setRooms(renameChatRoom(actionTarget.id, renameValue.trim()));
    setActionTarget(null);
  };

  const handleDelete = () => {
    if (!actionTarget) {
      return;
    }
    const nextRooms = deleteChatRoom(actionTarget.id);
    setRooms(nextRooms);
    if (activeRoomId === actionTarget.id) {
      setActiveRoomId(nextRooms[0]?.id || null);
    }
    setActionTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">채팅</h1>
            <p className="text-sm text-muted-foreground">채팅 목록을 기본으로 보고, 우측 상단에서 1:1 또는 그룹 채팅을 만듭니다.</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCompressed((value) => !value)}>
              <ChevronsUpDown className="h-4 w-4" />
            </Button>

            <Dialog open={directDialogOpen} onOpenChange={setDirectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  <Plus className="h-4 w-4" />
                  채팅 만들기
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 1:1 채팅</DialogTitle>
                  <DialogDescription>친구를 선택하면 바로 대화방이 생성됩니다.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {friends.map((friend) => (
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
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <Users className="h-4 w-4" />
                  그룹 채팅
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>그룹 채팅 만들기</DialogTitle>
                  <DialogDescription>그룹 이름과 참여할 친구를 선택해 주세요.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="그룹 이름" />
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <label key={friend.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                        <div>
                          <div className="font-medium">{friend.name}</div>
                          <div className="text-xs text-muted-foreground">{friend.phone}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreateGroup}>그룹 생성</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>채팅 목록</CardTitle>
              <CardDescription>1초 이상 누르면 이름 변경과 삭제가 가능합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  onPointerDown={() => startLongPress(room)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setActionTarget(room);
                    setRenameValue(room.name);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    activeRoomId === room.id ? "border-primary bg-primary/10" : "hover:bg-muted/40"
                  } ${compressed ? "py-2" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      {room.type === "group" ? <Users className="h-4 w-4 text-primary" /> : <MessageCircleMore className="h-4 w-4 text-primary" />}
                      {room.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{room.type === "group" ? "그룹" : "1:1"}</div>
                  </div>
                  {!compressed ? <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{getRoomPreview(room)}</div> : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="min-h-[70vh]">
            <CardHeader>
              <CardTitle>{activeRoom ? activeRoom.name : "채팅방을 선택해 주세요"}</CardTitle>
              <CardDescription>
                {activeRoom ? `${activeRoom.type === "group" ? "그룹" : "개인"} 채팅방입니다.` : "좌측 목록에서 대화방을 선택하세요."}
              </CardDescription>
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
              <div className="flex gap-2">
                <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력하세요" />
                <Button onClick={handleSend}>전송</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>채팅방 관리</DialogTitle>
              <DialogDescription>{actionTarget?.name} 채팅방의 이름을 바꾸거나 삭제합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="새 채팅방 이름" />
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
