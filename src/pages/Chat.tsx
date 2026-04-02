import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, Plus, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  createGroupRoom,
  ensureSocialSeed,
  getChatRooms,
  getFriends,
  getRoomMessages,
  saveChatMessage,
  type ChatRoom,
} from "@/services/socialStore";

const MY_USER_ID = "me";
const MY_USER_NAME = "나";

const Chat = () => {
  const { toast } = useToast();
  const [friends, setFriends] = useState(getFriends());
  const [rooms, setRooms] = useState(getChatRooms());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(getChatRooms()[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    ensureSocialSeed();
    const nextFriends = getFriends();
    const nextRooms = getChatRooms();
    setFriends(nextFriends);
    setRooms(nextRooms);
    setActiveRoomId((previous) => previous || nextRooms[0]?.id || null);
  }, []);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null;
  const messages = useMemo(() => (activeRoom ? getRoomMessages(activeRoom.id) : []), [activeRoom, rooms]);

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      toast({
        title: "그룹 생성 조건 부족",
        description: "그룹 이름과 2명 이상의 친구를 선택해 주세요.",
        variant: "destructive",
      });
      return;
    }

    const room = createGroupRoom(groupName.trim(), selectedMembers);
    const nextRooms = getChatRooms();
    setRooms(nextRooms);
    setActiveRoomId(room.id);
    setGroupName("");
    setSelectedMembers([]);
    toast({
      title: "그룹 대화방 생성",
      description: `${room.name} 방을 만들었습니다.`,
    });
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

  const getRoomPreview = (room: ChatRoom) => {
    const roomMessages = getRoomMessages(room.id);
    return roomMessages[roomMessages.length - 1]?.content || "새 대화를 시작해 보세요.";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">대화</h1>
          <p className="text-sm text-muted-foreground">1:1 대화와 그룹 대화를 시작할 수 있습니다.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>대화방 목록</CardTitle>
                <CardDescription>친구를 추가하면 1:1 대화방이 자동으로 연결됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveRoomId(room.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
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

            <Card>
              <CardHeader>
                <CardTitle>그룹 대화 만들기</CardTitle>
                <CardDescription>친구 2명 이상을 선택해 새 그룹 대화방을 생성합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="그룹 이름" />
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <label key={friend.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                      <div>
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-xs text-muted-foreground">{friend.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={handleCreateGroup} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  그룹 생성
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[70vh]">
            <CardHeader>
              <CardTitle>{activeRoom ? activeRoom.name : "대화방 선택"}</CardTitle>
              <CardDescription>{activeRoom ? `${activeRoom.type === "group" ? "그룹" : "개인"} 대화방입니다.` : "왼쪽에서 대화방을 선택하세요."}</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(70vh-110px)] flex-col gap-4">
              <ScrollArea className="flex-1 rounded-xl border p-4">
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
      </div>
    </div>
  );
};

export default Chat;
