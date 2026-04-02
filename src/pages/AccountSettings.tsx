import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [userIdChanged, setUserIdChanged] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [permissionTab, setPermissionTab] = useState<"health-connect" | "garmin" | "apple-health" | "strava">("health-connect");
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
    } catch (loadError) {
      console.error("Failed to load profile:", loadError);
      toast({
        title: "오류",
        description: "프로필 정보를 불러오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUserIdChange = async () => {
    if (userIdChanged) {
      toast({
        title: "변경 불가",
        description: "ID는 한 번만 변경할 수 있습니다.",
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
          title: "중복된 ID",
          description: "이미 사용 중인 ID입니다.",
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
        title: "ID 변경 완료",
        description: "사용자 ID를 변경했습니다.",
      });
    } catch (changeError: any) {
      toast({
        title: "ID 변경 실패",
        description: changeError?.errors?.[0]?.message || "ID 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "입력 오류",
        description: "비밀번호가 서로 일치하지 않습니다.",
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
        title: "비밀번호 변경 완료",
        description: "비밀번호를 저장했습니다.",
      });
    } catch (changeError: any) {
      toast({
        title: "비밀번호 변경 실패",
        description: changeError?.errors?.[0]?.message || "비밀번호 변경 중 오류가 발생했습니다.",
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
        title: "닉네임 저장 완료",
        description: "닉네임을 저장했습니다.",
      });
    } catch (saveError: any) {
      toast({
        title: "닉네임 저장 실패",
        description: saveError?.errors?.[0]?.message || "닉네임 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePermissionState = (storageKey: string, next: Record<string, boolean>) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollToTop />
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-3xl font-bold">사용자 계정 설정</h1>

        <Card>
          <CardHeader>
            <CardTitle>사용자 ID 변경</CardTitle>
            <CardDescription>
              현재 ID: <span className="font-semibold">{userId}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-id">새 ID</Label>
              <Input
                id="new-user-id"
                value={newUserId}
                onChange={(event) => setNewUserId(event.target.value)}
                placeholder="영문, 숫자, 언더스코어만 사용"
                disabled={userIdChanged || isLoading}
              />
            </div>
            <Button onClick={handleUserIdChange} disabled={userIdChanged || !newUserId || isLoading} className="w-full">
              ID 변경
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비밀번호 변경</CardTitle>
            <CardDescription>영문, 숫자, 특수문자를 포함한 10자 이상 비밀번호를 사용하세요.</CardDescription>
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
            <CardTitle>닉네임 변경</CardTitle>
            <CardDescription>설정 탭에서 제거한 닉네임 변경 기능을 사용자 계정 설정으로 옮겼습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <CardDescription>Health Connect, Garmin, Apple Health, Strava 권한 항목을 버튼으로 전환해 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={permissionTab} onValueChange={(value) => setPermissionTab(value as typeof permissionTab)}>
              <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                <TabsTrigger value="health-connect">Health Connect</TabsTrigger>
                <TabsTrigger value="garmin">Garmin</TabsTrigger>
                <TabsTrigger value="apple-health">Apple Health</TabsTrigger>
                <TabsTrigger value="strava">Strava</TabsTrigger>
              </TabsList>
            </Tabs>

            {permissionTab === "health-connect" && (
              <div className="space-y-3">
                {[
                  { key: "readSteps", label: "걸음수 읽기" },
                  { key: "readHeartRate", label: "심박수 읽기" },
                  { key: "readSleep", label: "수면 읽기" },
                  { key: "readExercise", label: "운동 읽기" },
                  { key: "readNutrition", label: "영양 읽기" },
                  { key: "readBodyComposition", label: "체성분 읽기" },
                  { key: "backgroundRead", label: "백그라운드 읽기" },
                ].map((permission) => (
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
              </div>
            )}

            {permissionTab === "garmin" && (
              <div className="space-y-3">
                {[
                  { key: "dailySummary", label: "일일 요약 데이터" },
                  { key: "activities", label: "운동 데이터" },
                  { key: "sleep", label: "수면 데이터" },
                  { key: "nutrition", label: "영양 데이터" },
                  { key: "hydration", label: "수분 데이터" },
                  { key: "bodyComposition", label: "체성분 데이터" },
                  { key: "heartRate", label: "심박수 데이터" },
                ].map((permission) => (
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
              </div>
            )}

            {permissionTab === "apple-health" && (
              <div className="space-y-3">
                {[
                  { key: "workouts", label: "운동 기록 읽기" },
                  { key: "activitySummary", label: "활동 요약 읽기" },
                  { key: "heartRate", label: "심박수 읽기" },
                  { key: "sleep", label: "수면 읽기" },
                  { key: "bodyComposition", label: "체성분 읽기" },
                  { key: "nutrition", label: "영양 읽기" },
                ].map((permission) => (
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
              </div>
            )}

            {permissionTab === "strava" && (
              <div className="space-y-3">
                {[
                  { key: "readActivities", label: "활동 읽기" },
                  { key: "readAllActivities", label: "비공개 활동 읽기" },
                  { key: "readAthlete", label: "선수 프로필 읽기" },
                  { key: "readRoutes", label: "경로 읽기" },
                ].map((permission) => (
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
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
          설정으로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default AccountSettings;
