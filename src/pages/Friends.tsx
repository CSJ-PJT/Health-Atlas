import { useEffect, useMemo, useRef, useState } from "react";
import { ContactRound, Pencil, Search, Trash2, UserCheck, UserPlus } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { DeviceContacts, type DeviceContact } from "@/lib/deviceContacts";
import { supabase } from "@/integrations/supabase/client";
import { ensureSocialSeed, getFriends, removeFriend, renameFriend, saveFriend, upsertDirectRoom, type FriendEntry } from "@/services/socialStore";

const Friends = () => {
  const { toast } = useToast();
  const longPressTimer = useRef<number | null>(null);
  const [friends, setFriends] = useState(getFriends());
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [userIdQuery, setUserIdQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<FriendEntry | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    ensureSocialSeed();
    setFriends(getFriends());
  }, []);

  const filteredFriends = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return friends;
    }

    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(keyword) ||
        friend.phone.toLowerCase().includes(keyword) ||
        friend.id.toLowerCase().includes(keyword),
    );
  }, [friends, search]);

  const startLongPress = (friend: FriendEntry) => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setActionTarget(friend);
      setRenameValue(friend.name);
    }, 1000);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleAddFriend = (contact: DeviceContact) => {
    const next = saveFriend(contact);
    setFriends(next);
    upsertDirectRoom({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      addedAt: new Date().toISOString(),
    });
    toast({
      title: "친구를 추가했습니다",
      description: `${contact.name}님과 바로 채팅을 시작할 수 있습니다.`,
    });
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
        description: "권한이나 기기 설정을 확인해 주세요.",
        variant: "destructive",
      });
    }
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
    setOpen(false);
  };

  const handleUserIdAdd = async () => {
    if (!userIdQuery.trim()) {
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("user_id, nickname")
      .eq("user_id", userIdQuery.trim())
      .maybeSingle();

    if (!data) {
      toast({
        title: "사용자를 찾지 못했습니다",
        description: "입력한 사용자 ID를 다시 확인해 주세요.",
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
    setOpen(false);
  };

  const handleRename = () => {
    if (!actionTarget || !renameValue.trim()) {
      return;
    }

    setFriends(renameFriend(actionTarget.id, renameValue.trim()));
    setActionTarget(null);
  };

  const handleDelete = () => {
    if (!actionTarget) {
      return;
    }
    setFriends(removeFriend(actionTarget.id));
    setActionTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">친구</h1>
            <p className="text-sm text-muted-foreground">친구 목록을 확인하고, 우측 상단에서 새 친구를 추가하세요.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <UserPlus className="h-4 w-4" />
                친구 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>친구 추가</DialogTitle>
                <DialogDescription>연락처, 직접 입력, 사용자 ID 중 원하는 방식으로 친구를 추가합니다.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">연락처에서 추가</CardTitle>
                    <CardDescription>연락처 권한을 허용하면 저장된 번호를 바로 친구로 추가할 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" onClick={() => void handleLoadContacts()} className="w-full gap-2">
                      <ContactRound className="h-4 w-4" />
                      연락처 불러오기
                    </Button>
                    <div className="max-h-72 space-y-3 overflow-y-auto">
                      {contacts.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          아직 불러온 연락처가 없습니다.
                        </div>
                      ) : (
                        contacts.slice(0, 30).map((contact) => (
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
                      <CardTitle className="text-base">사용자 ID로 추가</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={userIdQuery} onChange={(event) => setUserIdQuery(event.target.value)} placeholder="user_xxx" />
                      <Button onClick={() => void handleUserIdAdd()} className="w-full">
                        ID 검색 후 추가
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  닫기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>친구 목록</CardTitle>
            <CardDescription>1초 이상 누르면 이름 변경과 삭제가 가능합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 전화번호, 사용자 ID 검색" className="pl-9" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="rounded-2xl border bg-card/70 p-4"
                  onPointerDown={() => startLongPress(friend)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setActionTarget(friend);
                    setRenameValue(friend.name);
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    {friend.name}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{friend.phone}</div>
                  <div className="mt-1 text-xs text-muted-foreground">ID: {friend.id}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>친구 관리</DialogTitle>
              <DialogDescription>{actionTarget?.name}님의 표시 이름을 바꾸거나 목록에서 제거합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="새 이름" />
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

export default Friends;
