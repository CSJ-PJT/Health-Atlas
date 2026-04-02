import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createFeedPost, deleteFeedPost, ensureFeedSeed, getFeedPosts, updateFeedPost } from "@/services/feedStore";
import {
  createGroupRoom,
  ensureSocialSeed,
  getChatRooms,
  getFriends,
  getRoomMessages,
  saveChatMessage,
  type ChatRoom,
} from "@/services/socialStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "나";

const Chat = () => {
  const { toast } = useToast();
  const [friends, setFriends] = useState(getFriends());
  const [rooms, setRooms] = useState(getChatRooms());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(getChatRooms()[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [postDraft, setPostDraft] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [feedTick, setFeedTick] = useState(0);

  useEffect(() => {
    ensureSocialSeed();
    ensureFeedSeed();
    const nextFriends = getFriends();
    const nextRooms = getChatRooms();
    setFriends(nextFriends);
    setRooms(nextRooms);
    setActiveRoomId((previous) => previous || nextRooms[0]?.id || null);
  }, []);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null;
  const messages = useMemo(() => (activeRoom ? getRoomMessages(activeRoom.id) : []), [activeRoom, rooms]);
  const feedPosts = useMemo(() => getFeedPosts(), [feedTick]);

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      toast({ title: "그룹 생성 조건 부족", description: "그룹 이름과 2명 이상의 친구를 선택해 주세요.", variant: "destructive" });
      return;
    }

    const room = createGroupRoom(groupName.trim(), selectedMembers);
    setRooms(getChatRooms());
    setActiveRoomId(room.id);
    setGroupName("");
    setSelectedMembers([]);
  };

  const handleSend = () => {
    if (!activeRoom || !draft.trim()) {
      return;
    }
    saveChatMessage({ roomId: activeRoom.id, senderId: MY_USER_ID, senderName: MY_USER_NAME, content: draft.trim() });
    setDraft("");
    setRooms(getChatRooms());
  };

  const handleSavePost = () => {
    if (!postDraft.trim()) {
      return;
    }

    if (editingPostId) {
      updateFeedPost(editingPostId, postDraft.trim());
    } else {
      createFeedPost(MY_USER_ID, MY_USER_NAME, postDraft.trim());
    }

    setPostDraft("");
    setEditingPostId(null);
    setFeedTick((value) => value + 1);
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
          <p className="text-sm text-muted-foreground">개인/그룹 대화와 공개 피드를 함께 사용할 수 있습니다.</p>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">대화방</TabsTrigger>
            <TabsTrigger value="feed">공개 피드</TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>대화방 목록</CardTitle>
                    <CardDescription>친구와 1:1 또는 그룹 대화를 시작합니다.</CardDescription>
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
                    <CardDescription>친구 2명 이상을 선택해 그룹 대화방을 생성합니다.</CardDescription>
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
          </TabsContent>

          <TabsContent value="feed">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <Card>
                <CardHeader>
                  <CardTitle>게시글 작성</CardTitle>
                  <CardDescription>인스타그램처럼 게시글을 작성, 수정, 삭제할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={postDraft} onChange={(event) => setPostDraft(event.target.value)} placeholder="오늘 운동이나 건강 상태를 공유해 보세요." className="min-h-40" />
                  <Button onClick={handleSavePost} className="w-full">
                    {editingPostId ? "게시글 수정" : "게시글 등록"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {feedPosts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{post.authorName}</CardTitle>
                          <CardDescription>{new Date(post.createdAt).toLocaleString("ko-KR")}</CardDescription>
                        </div>
                        {post.authorId === MY_USER_ID ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => { setEditingPostId(post.id); setPostDraft(post.content); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => { deleteFeedPost(post.id); setFeedTick((value) => value + 1); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm leading-6">{post.content}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;
