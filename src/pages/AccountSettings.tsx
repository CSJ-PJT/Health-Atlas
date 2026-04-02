import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useDeviceBackNavigation("/admin");

  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [userIdChanged, setUserIdChanged] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("user_avatar") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [permissionTab, setPermissionTab] = useState<PermissionTab>("health-connect");
  const [healthConnectPermissions, setHealthConnectPermissions] = useState(defaultHealthConnectPermissions);
  const [garminPermissions, setGarminPermissions] = useState(defaultGarminPermissions);
  const [applePermissions, setApplePermissions] = useState(defaultApplePermissions);
  const [stravaPermissions, setStravaPermissions] = useState(defaultStravaPermissions);

  useEffect(() => {
    void loadProfileData();

    const storedHealthConnectPermissions = localStorage.getItem("health_connect_permissions");
    const storedGarminPermissions = localStorage.getItem("garmin_permissions");
    const storedApplePermissions = localStorage.getItem("apple_health_permissions");
    const storedStravaPermissions = localStorage.getItem("strava_permissions");

    if (storedHealthConnectPermissions) {
      setHealthConnectPermissions(JSON.parse(storedHealthConnectPermissions));
    }
    if (storedGarminPermissions) {
      setGarminPermissions(JSON.parse(storedGarminPermissions));
    }
    if (storedApplePermissions) {
      setApplePermissions(JSON.parse(storedApplePermissions));
    }
    if (storedStravaPermissions) {
      setStravaPermissions(JSON.parse(storedStravaPermissions));
    }
  }, []);

  const loadProfileData = async () => {
    try {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) {
        navigate("/setup");
        return;
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", storedUserId).maybeSingle();
      if (error) {
        throw error;
      }

      if (data) {
        setProfileId(data.id);
        setUserId(data.user_id);
        setNickname(data.nickname || "");
        setUserIdChanged(data.user_id_changed);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({
        title: "프로필을 불러오지 못했습니다",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  const handleUserIdChange = async () => {
    if (userIdChanged) {
      toast({
        title: "사용자 ID는 한 번만 변경할 수 있습니다",
        description: "현재 계정은 이미 사용자 ID를 변경했습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = userIdSchema.parse(newUserId);
      setIsLoading(true);

      const { data: existingUser } = await supabase.from("profiles").select("user_id").eq("user_id", validated).maybeSingle();
      if (existingUser) {
        toast({
          title: "이미 사용 중인 ID입니다",
          description: "다른 ID를 입력해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("profiles").update({ user_id: validated, user_id_changed: true }).eq("id", profileId);
      if (error) {
        throw error;
      }

      localStorage.setItem("user_id", validated);
      setUserId(validated);
      setUserIdChanged(true);
      setNewUserId("");
      toast({
        title: "사용자 ID를 변경했습니다",
        description: "이제 이 ID로 친구 추가가 가능합니다.",
      });
    } catch (error: any) {
      toast({
        title: "사용자 ID 변경 실패",
        description: error?.errors?.[0]?.message || "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "비밀번호가 일치하지 않습니다",
        description: "두 입력값을 다시 확인해 주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(password);
      setIsLoading(true);
      localStorage.setItem("user_password", btoa(password));
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "비밀번호를 저장했습니다",
      });
    } catch (error: any) {
      toast({
        title: "비밀번호 저장 실패",
        description: error?.errors?.[0]?.message || "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicknameSave = async () => {
    try {
      const validated = nicknameSchema.parse(nickname);
      setIsLoading(true);

      const { error } = await supabase.from("profiles").update({ nickname: validated }).eq("id", profileId);
      if (error) {
        throw error;
      }

      localStorage.setItem("user_nickname", validated);
      toast({
        title: "닉네임을 저장했습니다",
      });
    } catch (error: any) {
      toast({
        title: "닉네임 저장 실패",
        description: error?.errors?.[0]?.message || "잠시 후 다시 시도해 주세요.",
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
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      localStorage.setItem("user_avatar", result);
      setAvatarUrl(result);
      toast({
        title: "프로필 이미지를 변경했습니다",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollToTop />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <h1 className="text-3xl font-bold">사용자 계정 설정</h1>

        <Card>
          <CardHeader>
            <CardTitle>사용자 ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              현재 ID: <span className="font-semibold">{userId || "-"}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-id">새 사용자 ID</Label>
              <Input
                id="new-user-id"
                value={newUserId}
                onChange={(event) => setNewUserId(event.target.value)}
                placeholder="영문, 숫자, 언더바 사용"
                disabled={userIdChanged || isLoading}
              />
            </div>
            <Button onClick={handleUserIdChange} disabled={userIdChanged || !newUserId || isLoading} className="w-full">
              사용자 ID 저장
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비밀번호</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            <Button onClick={handlePasswordChange} disabled={!password || !confirmPassword || isLoading} className="w-full">
              비밀번호 저장
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAvatarFile(event.target.files?.[0] || null)}
            />
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border border-primary/20">
                <AvatarImage src={avatarUrl} alt={nickname || "profile"} />
                <AvatarFallback>{(nickname || "U").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                프로필 사진 변경
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </div>
            <Button onClick={handleNicknameSave} disabled={!nickname || isLoading} className="w-full">
              닉네임 저장
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>권한 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={permissionTab} onValueChange={(value) => setPermissionTab(value as PermissionTab)}>
              <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                <TabsTrigger value="health-connect">Health Connect</TabsTrigger>
                <TabsTrigger value="garmin">Garmin</TabsTrigger>
                <TabsTrigger value="apple-health">Apple Health</TabsTrigger>
                <TabsTrigger value="strava">Strava</TabsTrigger>
              </TabsList>
            </Tabs>

            {permissionTab === "health-connect" &&
              permissionOptions["health-connect"].map((permission) => (
                <div key={permission.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">{permission.label}</div>
                  <Switch
                    checked={healthConnectPermissions[permission.key as keyof typeof healthConnectPermissions]}
                    onCheckedChange={(checked) => {
                      const next = { ...healthConnectPermissions, [permission.key]: checked };
                      setHealthConnectPermissions(next);
                      savePermissionState("health_connect_permissions", next);
                    }}
                  />
                </div>
              ))}

            {permissionTab === "garmin" &&
              permissionOptions.garmin.map((permission) => (
                <div key={permission.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">{permission.label}</div>
                  <Switch
                    checked={garminPermissions[permission.key as keyof typeof garminPermissions]}
                    onCheckedChange={(checked) => {
                      const next = { ...garminPermissions, [permission.key]: checked };
                      setGarminPermissions(next);
                      savePermissionState("garmin_permissions", next);
                    }}
                  />
                </div>
              ))}

            {permissionTab === "apple-health" &&
              permissionOptions["apple-health"].map((permission) => (
                <div key={permission.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">{permission.label}</div>
                  <Switch
                    checked={applePermissions[permission.key as keyof typeof applePermissions]}
                    onCheckedChange={(checked) => {
                      const next = { ...applePermissions, [permission.key]: checked };
                      setApplePermissions(next);
                      savePermissionState("apple_health_permissions", next);
                    }}
                  />
                </div>
              ))}

            {permissionTab === "strava" &&
              permissionOptions.strava.map((permission) => (
                <div key={permission.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">{permission.label}</div>
                  <Switch
                    checked={stravaPermissions[permission.key as keyof typeof stravaPermissions]}
                    onCheckedChange={(checked) => {
                      const next = { ...stravaPermissions, [permission.key]: checked };
                      setStravaPermissions(next);
                      savePermissionState("strava_permissions", next);
                    }}
                  />
                </div>
              ))}
          </CardContent>
        </Card>

        <Button onClick={() => navigate("/admin")} variant="outline" className="w-full">
          설정으로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default AccountSettings;
