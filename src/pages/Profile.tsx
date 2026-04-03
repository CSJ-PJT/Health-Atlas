import { useMemo, useState } from "react";
import { ArrowLeft, Award, BarChart3, HeartPulse, Save, Trophy, UserRound } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getFeedPosts } from "@/services/feedStore";
import { getProfileSettings, saveProfileSettings } from "@/services/profileStore";

type ProfileState = {
  from?: string;
  profile?: {
    name?: string;
    userId?: string;
    score?: string;
    rank?: number;
    subtitle?: string;
    avatarUrl?: string;
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const state = (location.state || {}) as ProfileState;
  const backTarget = state.from || "/game";
  useDeviceBackNavigation(backTarget);

  const myUserId = localStorage.getItem("user_id") || "me";
  const myNickname = localStorage.getItem("user_nickname") || "사용자";
  const myAvatarUrl = localStorage.getItem("user_avatar") || "";
  const providerLabel = localStorage.getItem("active_health_provider") || "samsung";

  const isMyProfile = !params.profileName;
  const viewedUserId = isMyProfile ? myUserId : state.profile?.userId || decodeURIComponent(params.profileName || "user");
  const settings = getProfileSettings(
    viewedUserId,
    isMyProfile ? myNickname : state.profile?.name,
    isMyProfile ? myAvatarUrl : state.profile?.avatarUrl,
  );

  const [bio, setBio] = useState(settings.bio);
  const [showSummary, setShowSummary] = useState(settings.showSummary);

  const profile = useMemo(() => {
    if (isMyProfile) {
      return {
        name: myNickname,
        userId: myUserId,
        subtitle: "내 프로필",
        score: "나의 활동",
        rank: undefined,
        avatarUrl: myAvatarUrl,
      };
    }

    return {
      name: state.profile?.name || decodeURIComponent(params.profileName || "사용자"),
      userId: viewedUserId,
      subtitle: state.profile?.subtitle || "커뮤니티 멤버",
      score: state.profile?.score || "피드 사용자",
      rank: state.profile?.rank,
      avatarUrl: state.profile?.avatarUrl || settings.avatarUrl,
    };
  }, [isMyProfile, myAvatarUrl, myNickname, myUserId, params.profileName, settings.avatarUrl, state.profile, viewedUserId]);

  const visibleSummary = isMyProfile ? showSummary : settings.showSummary;
  const personalFeed = useMemo(
    () => getFeedPosts().filter((post) => post.authorId === profile.userId),
    [profile.userId],
  );

  const statCards = [
    { label: "활동 상태", value: profile.score, icon: Trophy },
    { label: "연동 공급자", value: providerLabel, icon: HeartPulse },
    { label: "프로필 유형", value: profile.subtitle, icon: UserRound },
    { label: "주간 순위", value: profile.rank ? `${profile.rank}위` : "내 프로필", icon: Award },
  ];

  const handleSave = () => {
    saveProfileSettings({
      userId: myUserId,
      nickname: myNickname,
      avatarUrl: myAvatarUrl,
      bio,
      showSummary,
    });
    toast({ title: "프로필 설명을 저장했습니다." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Button variant="outline" onClick={() => navigate(backTarget, { replace: true })} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/70 to-accent/40">
          <CardContent className="flex items-center gap-4 p-6">
            <Avatar className="h-20 w-20 border border-primary/20">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{profile.name}</div>
              <div className="text-sm text-muted-foreground">@{profile.userId}</div>
              <div className="text-sm text-primary">{profile.subtitle}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>소개</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMyProfile ? (
              <>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="나의 설명을 입력해 주세요."
                  className="min-h-28"
                />
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <span className="text-sm">프로필 요약 공개</span>
                  <Switch checked={showSummary} onCheckedChange={setShowSummary} />
                </div>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  저장
                </Button>
              </>
            ) : (
              <div className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
                {settings.bio || "등록된 소개가 없습니다."}
              </div>
            )}
          </CardContent>
        </Card>

        {visibleSummary ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                프로필 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      {card.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold">{card.value}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>개인 피드</CardTitle>
          </CardHeader>
          <CardContent>
            {personalFeed.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {personalFeed.map((post) => {
                  const media = post.media?.[0];
                  return (
                    <div key={post.id} className="overflow-hidden rounded-2xl border bg-card">
                      <div className="aspect-square bg-muted/30">
                        {media?.type === "video" ? (
                          <video poster={media.thumbnailUrl} src={media.url} className="h-full w-full object-cover" />
                        ) : media?.url ? (
                          <img src={media.url} alt={post.content || "피드 이미지"} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-3 text-sm text-muted-foreground">{post.content || "미디어 게시글"}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                아직 등록된 개인 피드가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
