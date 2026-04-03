import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { nicknameSchema, passwordSchema, userIdSchema } from "@/lib/validationSchemas";

const defaultHealthConnectPermissions = {
  readSteps: false,
  readHeartRate: false,
  readSleep: false,
  readExercise: false,
  readNutrition: false,
  readBodyComposition: false,
  backgroundRead: false,
};

const defaultGarminPermissions = {
  dailySummary: true,
  activities: true,
  sleep: true,
  nutrition: true,
  hydration: true,
  bodyComposition: true,
  heartRate: true,
};

const defaultApplePermissions = {
  workouts: true,
  activitySummary: true,
  heartRate: true,
  sleep: true,
  bodyComposition: true,
  nutrition: true,
};

const defaultStravaPermissions = {
  readActivities: true,
  readAllActivities: true,
  readAthlete: true,
  readRoutes: false,
};

const permissionOptions = {
  "health-connect": [
    { key: "readSteps", label: "걸음 수 읽기" },
    { key: "readHeartRate", label: "심박수 읽기" },
    { key: "readSleep", label: "수면 읽기" },
    { key: "readExercise", label: "운동 읽기" },
    { key: "readNutrition", label: "영양 읽기" },
    { key: "readBodyComposition", label: "체성분 읽기" },
    { key: "backgroundRead", label: "백그라운드 읽기" },
  ],
  garmin: [
    { key: "dailySummary", label: "일일 요약" },
    { key: "activities", label: "운동 기록" },
    { key: "sleep", label: "수면 기록" },
    { key: "nutrition", label: "영양 기록" },
    { key: "hydration", label: "수분 기록" },
    { key: "bodyComposition", label: "체성분 기록" },
    { key: "heartRate", label: "심박수 기록" },
  ],
  "apple-health": [
    { key: "workouts", label: "운동 기록" },
    { key: "activitySummary", label: "활동 요약" },
    { key: "heartRate", label: "심박수 읽기" },
    { key: "sleep", label: "수면 읽기" },
    { key: "bodyComposition", label: "체성분 읽기" },
    { key: "nutrition", label: "영양 읽기" },
  ],
  strava: [
    { key: "readActivities", label: "활동 읽기" },
    { key: "readAllActivities", label: "비공개 활동 읽기" },
    { key: "readAthlete", label: "선수 프로필 읽기" },
    { key: "readRoutes", label: "경로 읽기" },
  ],
} as const;

type PermissionTab = keyof typeof permissionOptions;

function generateTemporaryPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  return `RH${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}${symbols[Math.floor(Math.random() * symbols.length)]}${Date.now().toString().slice(-4)}`;
}

async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createPasswordSalt() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const AccountSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backTarget =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof (location.state as { from?: unknown }).from === "string"
      ? ((location.state as { from?: string }).from || "/admin")
      : "/admin";

  useDeviceBackNavigation(backTarget);

  const [profileId, setProfileId] = useState<string | null>(localStorage.getItem("profile_id"));
  const [userId, setUserId] = useState(localStorage.getItem("user_id") || "");
  const [newUserId, setNewUserId] = useState("");
  const [showUserIdEditor, setShowUserIdEditor] = useState(false);
  const [nickname, setNickname] = useState(localStorage.getItem("user_nickname") || "");
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("user_avatar") || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordEditor, setShowPasswordEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionTab, setPermissionTab] = useState<PermissionTab>("health-connect");
  const [healthConnectPermissions, setHealthConnectPermissions] = useState(defaultHealthConnectPermissions);
  const [garminPermissions, setGarminPermissions] = useState(defaultGarminPermissions);
  const [applePermissions, setApplePermissions] = useState(defaultApplePermissions);
  const [stravaPermissions, setStravaPermissions] = useState(defaultStravaPermissions);

  const storedPassword = localStorage.getItem("user_password") || "";
  const storedPasswordSalt = localStorage.getItem("user_password_salt") || "";
  const hasPassword = Boolean(storedPassword);

  useEffect(() => {
    void loadProfileData();
    const storedHealthConnectPermissions = localStorage.getItem("health_connect_permissions");
    const storedGarminPermissions = localStorage.getItem("garmin_permissions");
    const storedApplePermissions = localStorage.getItem("apple_health_permissions");
    const storedStravaPermissions = localStorage.getItem("strava_permissions");

    if (storedHealthConnectPermissions) setHealthConnectPermissions(JSON.parse(storedHealthConnectPermissions));
    if (storedGarminPermissions) setGarminPermissions(JSON.parse(storedGarminPermissions));
    if (storedApplePermissions) setApplePermissions(JSON.parse(storedApplePermissions));
    if (storedStravaPermissions) setStravaPermissions(JSON.parse(storedStravaPermissions));
  }, []);

  const ensureProfile = async (nextUserId: string, nextNickname: string) => {
    if (profileId) return profileId;

    const existing = await supabase.from("profiles").select("*").eq("user_id", nextUserId).maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data?.id) {
      setProfileId(existing.data.id);
      localStorage.setItem("profile_id", existing.data.id);
      return existing.data.id;
    }

    const created = await supabase
      .from("profiles")
      .insert({
        user_id: nextUserId,
        nickname: nextNickname || localStorage.getItem("user_nickname") || "사용자",
        user_id_changed: false,
      })
      .select()
      .single();

    if (created.error) throw created.error;
    setProfileId(created.data.id);
    localStorage.setItem("profile_id", created.data.id);
    return created.data.id;
  };

  const loadProfileData = async () => {
    const storedUserId = localStorage.getItem("user_id");
    const storedProfileId = localStorage.getItem("profile_id");

    if (!storedUserId) {
      navigate("/setup", { replace: true });
      return;
    }

    setUserId(storedUserId);

    try {
      if (storedProfileId) {
        const byId = await supabase.from("profiles").select("*").eq("id", storedProfileId).maybeSingle();
        if (byId.error) throw byId.error;
        if (byId.data) {
          setProfileId(byId.data.id);
          setUserId(byId.data.user_id);
          setNickname(byId.data.nickname || localStorage.getItem("user_nickname") || "");
          localStorage.setItem("user_id", byId.data.user_id);
          if (byId.data.nickname) {
            localStorage.setItem("user_nickname", byId.data.nickname);
          }
          return;
        }
      }

      const byUserId = await supabase.from("profiles").select("*").eq("user_id", storedUserId).maybeSingle();
      if (byUserId.error) throw byUserId.error;
      if (byUserId.data) {
        setProfileId(byUserId.data.id);
        setNickname(byUserId.data.nickname || localStorage.getItem("user_nickname") || "");
        localStorage.setItem("profile_id", byUserId.data.id);
        if (byUserId.data.nickname) {
          localStorage.setItem("user_nickname", byUserId.data.nickname);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const handleUserIdChange = async () => {
    try {
      const validated = userIdSchema.parse(newUserId);
      setIsLoading(true);

      try {
        const { data: existingUser, error: existingError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", validated)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existingUser) {
          toast({ title: "이미 사용 중인 사용자 ID입니다.", variant: "destructive" });
          return;
        }

        const ensuredProfileId = await ensureProfile(userId || validated, nickname || "사용자");
        const { error } = await supabase.from("profiles").update({ user_id: validated, user_id_changed: true }).eq("id", ensuredProfileId);
        if (error) throw error;
      } catch (databaseError) {
        console.error("Falling back to local ID save:", databaseError);
      }

      localStorage.setItem("user_id", validated);
      setUserId(validated);
      setShowUserIdEditor(false);
      setNewUserId("");
      toast({ title: "사용자 ID를 저장했습니다." });
    } catch (error: any) {
      toast({
        title: "사용자 ID 저장 실패",
        description: error?.errors?.[0]?.message || error?.message || "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "비밀번호가 일치하지 않습니다.",
        description: "입력값을 다시 확인해 주세요.",
        variant: "destructive",
      });
      return;
    }

    if (hasPassword) {
      const currentHash = await hashPassword(currentPassword, storedPasswordSalt);
      if (currentHash !== storedPassword) {
        toast({
          title: "기존 비밀번호가 올바르지 않습니다.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      passwordSchema.parse(password);
      setIsLoading(true);
      const salt = createPasswordSalt();
      const hashed = await hashPassword(password, salt);
      localStorage.setItem("user_password", hashed);
      localStorage.setItem("user_password_salt", salt);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowPasswordEditor(false);
      toast({ title: "비밀번호를 저장했습니다." });
    } catch (error: any) {
      toast({
        title: "비밀번호 저장 실패",
        description: error?.errors?.[0]?.message || error?.message || "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (channel: "kakao" | "line") => {
    const temporaryPassword = generateTemporaryPassword();
    const salt = createPasswordSalt();
    const hashed = await hashPassword(temporaryPassword, salt);
    localStorage.setItem("user_password", hashed);
    localStorage.setItem("user_password_salt", salt);
    setShowPasswordEditor(true);
    setCurrentPassword(temporaryPassword);
    toast({
      title: `${channel === "kakao" ? "카카오톡" : "LINE"}으로 임시 비밀번호를 보냈습니다.`,
      description: `프로토타입 기준 임시 비밀번호: ${temporaryPassword}`,
    });
  };

  const handleNicknameSave = async () => {
    const storedUserId = localStorage.getItem("user_id");

    try {
      const validated = nicknameSchema.parse(nickname);
      if (!storedUserId) {
        throw new Error("사용자 정보가 없습니다.");
      }

      setIsLoading(true);
      const ensuredProfileId = await ensureProfile(storedUserId, validated);
      const { error } = await supabase.from("profiles").update({ nickname: validated }).eq("id", ensuredProfileId);
      if (error) throw error;

      localStorage.setItem("user_nickname", validated);
      toast({ title: "닉네임을 저장했습니다." });
    } catch (error: any) {
      toast({
        title: "닉네임 저장 실패",
        description: error?.errors?.[0]?.message || error?.message || "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePermissionState = (storageKey: string, next: Record<string, boolean>) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      localStorage.setItem("user_avatar", result);
      setAvatarUrl(result);
      toast({ title: "프로필 사진을 변경했습니다." });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollToTop />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">사용자 계정 설정</h1>
          <Button variant="outline" onClick={() => navigate(backTarget, { replace: true })}>
            설정으로 돌아가기
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-primary/20">
                <AvatarImage src={avatarUrl} alt={nickname || "profile"} />
                <AvatarFallback>{(nickname || "U").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleAvatarFile(event.target.files?.[0] || null)}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  프로필 사진 변경
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <div className="flex gap-2">
                <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임을 입력해 주세요" />
                <Button onClick={() => void handleNicknameSave()} disabled={isLoading}>
                  저장
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>사용자 ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              현재 ID: <span className="font-semibold">{userId || "-"}</span>
            </div>

            {!userId || showUserIdEditor ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-user-id">새 사용자 ID</Label>
                  <Input
                    id="new-user-id"
                    value={newUserId}
                    onChange={(event) => setNewUserId(event.target.value)}
                    placeholder="영문, 숫자, 밑줄 사용"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => void handleUserIdChange()} disabled={isLoading}>
                    사용자 ID 저장
                  </Button>
                  {userId ? (
                    <Button variant="outline" onClick={() => setShowUserIdEditor(false)}>
                      닫기
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowUserIdEditor(true)}>
                사용자 ID 변경
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비밀번호</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              상태: <span className="font-semibold">{hasPassword ? "저장됨" : "미설정"}</span>
            </div>

            {!hasPassword || showPasswordEditor ? (
              <div className="space-y-3">
                {hasPassword ? (
                  <div className="space-y-2">
                    <Label htmlFor="current-password">기존 비밀번호</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="password">새 비밀번호</Label>
                  <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  <div className="text-xs text-muted-foreground">9자 이상, 영문 포함, 특수문자 포함</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handlePasswordChange()} disabled={isLoading}>
                    비밀번호 저장
                  </Button>
                  {hasPassword ? (
                    <Button variant="outline" onClick={() => setShowPasswordEditor(false)}>
                      닫기
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowPasswordEditor(true)}>
                  비밀번호 변경
                </Button>
                <Button variant="outline" onClick={() => void handlePasswordReset("kakao")}>
                  카카오톡으로 임시 비밀번호 받기
                </Button>
                <Button variant="outline" onClick={() => void handlePasswordReset("line")}>
                  LINE으로 임시 비밀번호 받기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>권한 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={permissionTab} onValueChange={(value) => setPermissionTab(value as PermissionTab)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
                <TabsTrigger value="health-connect">Health Connect</TabsTrigger>
                <TabsTrigger value="garmin">Garmin</TabsTrigger>
                <TabsTrigger value="apple-health">Apple Health</TabsTrigger>
                <TabsTrigger value="strava">Strava</TabsTrigger>
              </TabsList>

              {(["health-connect", "garmin", "apple-health", "strava"] as const).map((tabKey) => (
                <TabsContent key={tabKey} value={tabKey} className="space-y-3 pt-4">
                  {permissionOptions[tabKey].map((option) => {
                    const currentPermissions =
                      tabKey === "health-connect"
                        ? healthConnectPermissions
                        : tabKey === "garmin"
                          ? garminPermissions
                          : tabKey === "apple-health"
                            ? applePermissions
                            : stravaPermissions;

                    const setPermissions =
                      tabKey === "health-connect"
                        ? setHealthConnectPermissions
                        : tabKey === "garmin"
                          ? setGarminPermissions
                          : tabKey === "apple-health"
                            ? setApplePermissions
                            : setStravaPermissions;

                    const storageKey =
                      tabKey === "health-connect"
                        ? "health_connect_permissions"
                        : tabKey === "garmin"
                          ? "garmin_permissions"
                          : tabKey === "apple-health"
                            ? "apple_health_permissions"
                            : "strava_permissions";

                    return (
                      <div key={option.key} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <span className="text-sm">{option.label}</span>
                        <Switch
                          checked={Boolean(currentPermissions[option.key as keyof typeof currentPermissions])}
                          onCheckedChange={(checked) => {
                            const next = { ...currentPermissions, [option.key]: checked };
                            setPermissions(next as typeof currentPermissions);
                            savePermissionState(storageKey, next as Record<string, boolean>);
                          }}
                        />
                      </div>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
