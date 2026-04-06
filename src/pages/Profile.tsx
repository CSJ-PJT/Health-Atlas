import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Award, BarChart3, Camera, HeartPulse, ImagePlus, Plus, Save, Trophy, UserRound } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getEarnedBadges } from "@/services/achievementStore";
import { createScopedFeedPost, getFeedPosts, hydrateFeedStoreFromServer, subscribeFeedStoreChanges, type FeedMedia } from "@/services/feedStore";
import { getProfileSettings, hydrateProfileSettingsFromServer, saveProfileSettings } from "@/services/profileStore";
import { buildRecordTag, findDisplayedRecord, hydrateVerifiedRecordsFromServer } from "@/services/verifiedRecordStore";

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

function buildVideoThumb(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#c9b0ff" offset="0%"/>
          <stop stop-color="#f7f1ff" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="900" height="900" rx="48" fill="url(#g)"/>
      <circle cx="450" cy="450" r="170" fill="rgba(255,255,255,0.86)"/>
      <polygon points="410,360 560,450 410,540" fill="#6f48c9"/>
      <text x="70" y="120" fill="#432770" font-family="Arial" font-size="40" font-weight="700">RH Healthcare</text>
      <text x="70" y="760" fill="#4d2f80" font-family="Arial" font-size="34">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resizeImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1400;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("이미지를 처리할 수 없습니다."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const state = (location.state || {}) as ProfileState;
  const backTarget = state.from || "/game";
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const feedInputRef = useRef<HTMLInputElement | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [personalCaption, setPersonalCaption] = useState("");

  useDeviceBackNavigation({
    fallback: backTarget,
    onBackWithinPage: () => {
      if (photoOpen) {
        setPhotoOpen(false);
        return true;
      }
      return false;
    },
  });

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
    { isCurrentUser: isMyProfile },
  );

  const [bio, setBio] = useState(settings.bio);
  const [showSummary, setShowSummary] = useState(settings.showSummary);
  const [showBadges, setShowBadges] = useState(settings.showBadges);
  const [showPersonalFeed, setShowPersonalFeed] = useState(settings.showPersonalFeed);

  useEffect(() => {
    setBio(settings.bio);
    setShowSummary(settings.showSummary);
    setShowBadges(settings.showBadges);
    setShowPersonalFeed(settings.showPersonalFeed);
  }, [settings.bio, settings.showBadges, settings.showPersonalFeed, settings.showSummary, reloadTick]);

  useEffect(() => {
    void (async () => {
      const [profileChanged, recordChanged, feedChanged] = await Promise.all([
        hydrateProfileSettingsFromServer(),
        hydrateVerifiedRecordsFromServer(),
        hydrateFeedStoreFromServer(),
      ]);
      if (profileChanged || recordChanged || feedChanged) {
        setReloadTick((value) => value + 1);
      }
    })();

    const unsubscribe = subscribeFeedStoreChanges(() => {
      setReloadTick((value) => value + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const earnedBadges = useMemo(() => getEarnedBadges(), [reloadTick]);
  const displayedRecord = findDisplayedRecord();
  const recordTag = buildRecordTag(displayedRecord);
  const allPosts = useMemo(() => getFeedPosts(), [reloadTick]);
  const personalFeed = useMemo(
    () => allPosts.filter((post) => post.authorId === viewedUserId && (post.visibility || "public") === "profile"),
    [allPosts, viewedUserId],
  );

  const profile = useMemo(() => {
    if (isMyProfile) {
      return {
        name: myNickname,
        userId: myUserId,
        subtitle: "나의 프로필",
        score: "나의 활동",
        rank: undefined,
        avatarUrl: localStorage.getItem("user_avatar") || myAvatarUrl,
      };
    }

    return {
      name: state.profile?.name || decodeURIComponent(params.profileName || "사용자"),
      userId: viewedUserId,
      subtitle: state.profile?.subtitle || "커뮤니티 멤버",
      score: state.profile?.score || "활동 사용자",
      rank: state.profile?.rank,
      avatarUrl: settings.avatarUrl,
    };
  }, [isMyProfile, myAvatarUrl, myNickname, myUserId, params.profileName, settings.avatarUrl, state.profile, viewedUserId]);

  const visibleSummary = (isMyProfile ? showSummary : settings.showSummary) && (profile.score || recordTag || profile.rank);
  const visibleBadges = (isMyProfile ? showBadges : settings.showBadges) && earnedBadges.length > 0;
  const visiblePersonalFeed = (isMyProfile ? showPersonalFeed : settings.showPersonalFeed) && personalFeed.length > 0;
  const visibleBio = Boolean((isMyProfile ? bio : settings.bio).trim());

  const statCards = [
    { label: "활동 상태", value: profile.score, icon: Trophy },
    { label: "연동 공급자", value: providerLabel, icon: HeartPulse },
    { label: "프로필 유형", value: profile.subtitle, icon: UserRound },
    { label: "주간 순위", value: profile.rank ? `${profile.rank}위` : "개인 프로필", icon: Award },
  ].filter((item) => Boolean(item.value));

  const handleSave = () => {
    saveProfileSettings({
      userId: myUserId,
      nickname: myNickname,
      avatarUrl: localStorage.getItem("user_avatar") || myAvatarUrl,
      bio,
      showSummary,
      showBadges,
      showPersonalFeed,
    });
    setReloadTick((value) => value + 1);
    toast({ title: "프로필 설정을 저장했습니다." });
  };

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("user_avatar", String(reader.result || ""));
      setReloadTick((value) => value + 1);
      toast({ title: "프로필 사진을 변경했습니다." });
    };
    reader.readAsDataURL(file);
  };

  const handlePersonalFeedUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextMedia: FeedMedia[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("video/")) {
        nextMedia.push({
          id: `profile-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "video",
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          thumbnailUrl: buildVideoThumb(file.name),
        });
      } else {
        const resized = await resizeImageFile(file);
        nextMedia.push({
          id: `profile-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "image",
          url: resized,
          thumbnailUrl: resized,
        });
      }
    }

    const success = createScopedFeedPost(myUserId, myNickname, personalCaption.trim(), nextMedia, "profile");
    if (!success) {
      toast({ title: "개인 피드 업로드에 실패했습니다.", variant: "destructive" });
      return;
    }
    setPersonalCaption("");
    setReloadTick((value) => value + 1);
    toast({ title: "개인 피드에 게시했습니다." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Button variant="outline" onClick={() => navigate(backTarget, { replace: true })} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleAvatarChange(event.target.files?.[0] || null)}
        />
        <input
          ref={feedInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => void handlePersonalFeedUpload(event.target.files)}
        />

        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/70 to-accent/40">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <button type="button" className="relative" onClick={() => setPhotoOpen(true)}>
                  <Avatar className="h-24 w-24 border border-primary/20">
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                    <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{profile.name}</div>
                  <div className="text-sm text-muted-foreground">@{profile.userId}</div>
                  <div className="text-sm text-primary">{profile.subtitle}</div>
                  {recordTag ? <div className="inline-flex rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">{recordTag}</div> : null}
                </div>
              </div>

              {isMyProfile ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => feedInputRef.current?.click()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            {isMyProfile ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Textarea
                  value={personalCaption}
                  onChange={(event) => setPersonalCaption(event.target.value)}
                  placeholder="개인 피드에 함께 남길 문구를 입력하세요"
                  className="min-h-24 bg-background/90"
                />
                <div className="space-y-3 rounded-2xl border bg-background/80 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>프로필 요약 공개</span>
                    <Switch checked={showSummary} onCheckedChange={setShowSummary} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>나의 배지 공개</span>
                    <Switch checked={showBadges} onCheckedChange={setShowBadges} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>개인 피드 공개</span>
                    <Switch checked={showPersonalFeed} onCheckedChange={setShowPersonalFeed} />
                  </div>
                  <Button onClick={handleSave} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    저장
                  </Button>
                </div>
              </div>
            ) : null}

            {visiblePersonalFeed ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {personalFeed.map((post) => {
                  const first = post.media?.[0];
                  return (
                    <div key={post.id} className="overflow-hidden rounded-2xl border bg-card">
                      <div className="aspect-square bg-muted/30">
                        {first?.type === "video" ? (
                          <video poster={first.thumbnailUrl} src={first.url} className="h-full w-full object-cover" />
                        ) : first?.url ? (
                          <img src={first.url} alt={post.content || "개인 피드"} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      {post.content ? <div className="p-3 text-sm text-muted-foreground">{post.content}</div> : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {visibleSummary ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="h-5 w-5 text-primary" />
                프로필 요약
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>
        ) : null}

        {visibleBio ? (
          <div className="px-1 text-sm leading-7 text-muted-foreground">
            {isMyProfile ? bio : settings.bio}
          </div>
        ) : null}

        {visibleBadges ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Award className="h-5 w-5 text-primary" />
                나의 배지
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {earnedBadges.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border p-4">
                    <div className="text-lg font-semibold">{badge.icon}</div>
                    <div className="mt-2 font-medium">{badge.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{badge.description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{profile.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border bg-muted/20">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-full object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center">이미지가 없습니다.</div>
            )}
          </div>
          {isMyProfile ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => avatarInputRef.current?.click()}>
                사진 변경
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
