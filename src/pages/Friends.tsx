import { useEffect, useMemo, useState } from "react";
import { ContactRound, Phone, Plus, RefreshCw, UserCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DeviceContacts, type DeviceContact } from "@/lib/deviceContacts";
import { supabase } from "@/integrations/supabase/client";
import { ensureSocialSeed, getFriends, saveFriend, upsertDirectRoom } from "@/services/socialStore";

const Friends = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [friends, setFriends] = useState(getFriends());
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [userIdQuery, setUserIdQuery] = useState("");

  useEffect(() => {
    ensureSocialSeed();
    setFriends(getFriends());
  }, []);

  const filteredContacts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return contacts;
    }
    return contacts.filter(
      (contact) => contact.name.toLowerCase().includes(keyword) || contact.phone.toLowerCase().includes(keyword),
    );
  }, [contacts, search]);

  const handleLoadContacts = async () => {
    try {
      const status = await DeviceContacts.getPermissionStatus();
      const granted = status.granted ? status : await DeviceContacts.requestContactsPermission();
      if (!granted.granted) {
        toast({
          title: "연락처 권한 필요",
          description: "친구 추가를 위해 연락처 권한을 허용해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const result = await DeviceContacts.getContacts();
      setContacts(result.contacts || []);
      toast({
        title: "연락처 불러오기 완료",
        description: `${result.contacts?.length || 0}개의 연락처를 읽었습니다.`,
      });
    } catch (contactError) {
      console.error("Failed to load contacts:", contactError);
      toast({
        title: "연락처 불러오기 실패",
        description: "연락처 플러그인을 사용할 수 없어 수동 추가를 사용합니다.",
        variant: "destructive",
      });
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
      title: "친구 추가 완료",
      description: `${contact.name}님을 친구로 추가했습니다.`,
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
      toast({ title: "사용자 없음", description: "해당 사용자 ID를 찾지 못했습니다.", variant: "destructive" });
      return;
    }

    handleAddFriend({
      id: data.user_id,
      name: data.nickname || data.user_id,
      phone: `id:${data.user_id}`,
    });
    setUserIdQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">친구</h1>
          <p className="text-sm text-muted-foreground">연락처 기반으로 친구를 추가하고 대화방을 시작합니다.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle>연락처에서 친구 추가</CardTitle>
              <CardDescription>기기 연락처를 읽어 친구 목록에 바로 추가할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 또는 전화번호 검색" />
                <Button onClick={() => void handleLoadContacts()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  동기화
                </Button>
              </div>

              <div className="space-y-3">
                {filteredContacts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    아직 불러온 연락처가 없습니다. 상단 동기화 버튼을 눌러 주세요.
                  </div>
                ) : (
                  filteredContacts.slice(0, 30).map((contact) => (
                    <div key={`${contact.id}-${contact.phone}`} className="flex items-center justify-between rounded-xl border p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold">
                          <ContactRound className="h-4 w-4 text-primary" />
                          <span className="truncate">{contact.name}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </div>
                      </div>
                      <Button onClick={() => handleAddFriend(contact)} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
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
                <CardTitle>수동 친구 추가</CardTitle>
                <CardDescription>연락처 권한이 없을 때 이름과 전화번호로 직접 추가합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="이름" />
                <Input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} placeholder="전화번호" />
                <Button onClick={handleManualAdd} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  친구 추가
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 ID로 친구 추가</CardTitle>
                <CardDescription>앱 사용자 ID를 알고 있으면 직접 검색해 친구로 추가합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={userIdQuery} onChange={(event) => setUserIdQuery(event.target.value)} placeholder="user_xxx" />
                <Button onClick={() => void handleUserIdAdd()} className="w-full">
                  사용자 ID로 추가
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>내 친구 목록</CardTitle>
                <CardDescription>추가된 친구는 채팅 탭에서 1:1 또는 그룹 대화를 시작할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between rounded-xl border p-4">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        {friend.name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{friend.phone}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">추가됨</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
