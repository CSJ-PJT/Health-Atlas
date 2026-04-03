import { useMemo } from "react";
import { ArrowLeft, Award, BarChart3, HeartPulse, Trophy, UserRound } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileState = {
  from?: string;
  profile?: {
    name?: string;
    score?: string;
    rank?: number;
    subtitle?: string;
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const state = (location.state || {}) as ProfileState;
  const backTarget = state.from || "/game";
  useDeviceBackNavigation(backTarget);

  const isMyProfile = !params.profileName;
  const nickname = localStorage.getItem("user_nickname") || "사용자";
  const avatarUrl = localStorage.getItem("user_avatar") || "";
  const providerLabel = localStorage.getItem("active_health_provider") || "samsung";

  const profile = useMemo(() => {
    if (isMyProfile) {
      return {
        name: nickname,
        score: "나의 활동",
        rank: undefined,
        subtitle: "개인 프로필",
        avatarUrl,
      };
    }

    return {
      name: decodeURIComponent(params.profileName || state.profile?.name || "사용자"),
      score: state.profile?.score || "커뮤니티 멤버",
      rank: state.profile?.rank,
      subtitle: state.profile?.subtitle || "주간 리더보드",
      avatarUrl: "",
    };
  }, [avatarUrl, isMyProfile, nickname, params.profileName, state.profile]);

  const statCards = [
    { label: "활동 상태", value: profile.score, icon: Trophy },
    { label: "연동 공급자", value: providerLabel, icon: HeartPulse },
    { label: "프로필 유형", value: profile.subtitle, icon: UserRound },
    { label: "주간 순위", value: profile.rank ? `${profile.rank}위` : "나", icon: Award },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
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
              <div className="text-sm text-muted-foreground">{profile.subtitle}</div>
              <div className="text-sm text-primary">{profile.score}</div>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
};

export default Profile;
