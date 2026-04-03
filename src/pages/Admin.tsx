import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, KeyRound, Plus, RefreshCw, Settings2, Trash2, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateHealthData } from "@/hooks/useHealthData";
import { supabase } from "@/integrations/supabase/client";
import { getAppleHealthProviderConfig, setAppleHealthProviderConfig } from "@/providers/apple";
import { getGarminProviderConfig, setGarminProviderConfig } from "@/providers/garmin";
import {
  getActiveProvider,
  getProviderMeta,
  getStoredProviderId,
  isMockHealthDataEnabled,
  setMockHealthDataEnabled,
  setStoredProviderId,
} from "@/providers/shared";
import type { ProviderId } from "@/providers/shared";
import { createTransferLog } from "@/providers/shared/services/transferLogRepository";
import { getSamsungLastSyncAt, setSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";
import { getStravaProviderConfig, setStravaProviderConfig } from "@/providers/strava";
import { getDisplaySettings, saveDisplaySettings, type DisplaySettings } from "@/services/displaySettings";
import {
  buildRecordTag,
  getDisplayedRecordType,
  getVerifiedRecords,
  saveVerifiedRecord,
  setDisplayedRecordType,
  type RecordType,
} from "@/services/verifiedRecordStore";
import { awardBadge } from "@/services/achievementStore";
import { startKakaoLogin } from "@/services/auth/kakaoAuth";
import { startLineLogin } from "@/services/auth/lineAuth";
import {
  getKakaoAuthConfig,
  getLineAuthConfig,
  setKakaoAuthConfig,
  setLineAuthConfig,
} from "@/services/auth/socialAuthStore";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: string;
  message: string;
}

interface EquipmentEntry {
  id: string;
  type: string;
  name: string;
  distanceKm: string;
}

const providers: ProviderId[] = ["samsung", "garmin", "apple-health", "strava"];

const themeOptions = [
  { value: "theme-lavender", label: "Lavender", colors: ["#9f67f5", "#d3b5ff"] },
  { value: "theme-iris", label: "Iris", colors: ["#5d69ff", "#b3b9ff"] },
  { value: "theme-rose", label: "Rose", colors: ["#ee5f93", "#ffc0d7"] },
  { value: "theme-ocean", label: "Ocean", colors: ["#11a8d8", "#9fe7ff"] },
  { value: "theme-peach", label: "Peach", colors: ["#ff8d52", "#ffd0b0"] },
  { value: "theme-midnight", label: "Midnight", colors: ["#9c73ff", "#2b214a"] },
  { value: "theme-aurora", label: "Aurora", colors: ["#57c9a5", "#d2fff2"] },
  { value: "theme-sunset", label: "Sunset", colors: ["#ff6f61", "#ffd1c9"] },
  { value: "theme-forest", label: "Forest", colors: ["#2e8f6a", "#c8f2df"] },
  { value: "theme-plum", label: "Plum", colors: ["#7a4b9f", "#e4d2f6"] },
] as const;

const displayOptions = {
  home: [
    { key: "steps", label: "걸음 목표" },
    { key: "sleep", label: "수면 목표" },
    { key: "calories", label: "칼로리 목표" },
    { key: "highlights", label: "운동 하이라이트" },
    { key: "body-balance", label: "바디 밸런스" },
    { key: "heart", label: "심박 카드" },
    { key: "body", label: "신체 구성 카드" },
    { key: "nutrition", label: "영양 카드" },
    { key: "running", label: "러닝 카드" },
  ],
  history: [
    { key: "distanceKm", label: "거리" },
    { key: "durationMinutes", label: "시간" },
    { key: "avgPace", label: "평균 페이스" },
    { key: "bestPace", label: "최고 페이스" },
    { key: "averageSpeed", label: "평균 시속" },
    { key: "maxSpeed", label: "최고 시속" },
    { key: "avgHeartRate", label: "평균 심박수" },
    { key: "cadence", label: "평균 케이던스" },
  ],
  comparison: [
    { key: "distanceKm", label: "거리" },
    { key: "durationMinutes", label: "시간" },
    { key: "avgPace", label: "평균 페이스" },
    { key: "bestPace", label: "최고 페이스" },
    { key: "averageSpeed", label: "평균 시속" },
    { key: "maxSpeed", label: "최고 시속" },
    { key: "avgHeartRate", label: "평균 심박수" },
    { key: "cadence", label: "평균 케이던스" },
    { key: "vo2max", label: "VO2 Max" },
    { key: "elevationGain", label: "총 상승" },
  ],
} as const;

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const invalidateHealthData = useInvalidateHealthData();
  useDeviceBackNavigation({ fallback: "/admin", isRootPage: true });
  const [activeProvider, setActiveProvider] = useState<ProviderId>("samsung");
  const [mockHealthDataEnabled, setMockHealthDataState] = useState(true);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(getDisplaySettings());
  const [apiDialog, setApiDialog] = useState<null | "garmin" | "samsung" | "apple" | "strava" | "kakao" | "line">(null);
  const [providerStatus, setProviderStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [gptStatus, setGptStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const [isSyncing, setIsSyncing] = useState(false);
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [providerLastSync, setProviderLastSync] = useState("");
  const [gptLastSync, setGptLastSync] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [garminApiBaseUrl, setGarminApiBaseUrl] = useState("");
  const [garminAccessToken, setGarminAccessToken] = useState("");
  const [garminUserId, setGarminUserId] = useState("");
  const [samsungApiKey, setSamsungApiKey] = useState(localStorage.getItem("samsung_health_api_key") || "");
  const [samsungClientId, setSamsungClientId] = useState(localStorage.getItem("samsung_health_client_id") || "");
  const [appleAppId, setAppleAppId] = useState("");
  const [appleTeamId, setAppleTeamId] = useState("");
  const [appleRedirectUri, setAppleRedirectUri] = useState("");
  const [stravaClientId, setStravaClientId] = useState("");
  const [stravaClientSecret, setStravaClientSecret] = useState("");
  const [stravaRefreshToken, setStravaRefreshToken] = useState("");
  const [stravaAthleteId, setStravaAthleteId] = useState("");
  const [kakaoRestApiKey, setKakaoRestApiKey] = useState("");
  const [kakaoClientSecret, setKakaoClientSecret] = useState("");
  const [kakaoRedirectUri, setKakaoRedirectUri] = useState("https://rhhealthcare.app/auth/kakao/callback");
  const [kakaoConsentScope, setKakaoConsentScope] = useState("profile_nickname,account_email,name,phone_number");
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineClientSecret, setLineClientSecret] = useState("");
  const [lineRedirectUri, setLineRedirectUri] = useState("https://rhhealthcare.app/auth/line/callback");
  const [lineScope, setLineScope] = useState("profile openid email");
  const [equipments, setEquipments] = useState<EquipmentEntry[]>([]);
  const [equipmentType, setEquipmentType] = useState("신발");
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentDistanceKm, setEquipmentDistanceKm] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("full");
  const [recordLabel, setRecordLabel] = useState("");
  const [officialTime, setOfficialTime] = useState("");
  const [displayRecordType, setDisplayRecordTypeState] = useState<RecordType>("full");
  const [verifiedRecords, setVerifiedRecords] = useState(getVerifiedRecords());

  useEffect(() => {
    const garminConfig = getGarminProviderConfig();
    const appleConfig = getAppleHealthProviderConfig();
    const stravaConfig = getStravaProviderConfig();
    const kakaoConfig = getKakaoAuthConfig();
    const lineConfig = getLineAuthConfig();
    const savedSyncEnabled = localStorage.getItem("scheduled_sync_enabled");
    const savedSyncTime = localStorage.getItem("sync_time");
    const storedEquipments = localStorage.getItem("equipment_settings_v1");

    setActiveProvider(getStoredProviderId());
    setMockHealthDataState(isMockHealthDataEnabled());
    setDisplaySettings(getDisplaySettings());
    setGarminApiBaseUrl(garminConfig.apiBaseUrl);
    setGarminAccessToken(garminConfig.accessToken);
    setGarminUserId(garminConfig.userId);
    setAppleAppId(appleConfig.appId);
    setAppleTeamId(appleConfig.teamId);
    setAppleRedirectUri(appleConfig.redirectUri);
    setStravaClientId(stravaConfig.clientId);
    setStravaClientSecret(stravaConfig.clientSecret);
    setStravaRefreshToken(stravaConfig.refreshToken);
    setStravaAthleteId(stravaConfig.athleteId);
    setKakaoRestApiKey(kakaoConfig.restApiKey);
    setKakaoClientSecret(kakaoConfig.clientSecret);
    setKakaoRedirectUri(kakaoConfig.redirectUri);
    setKakaoConsentScope(kakaoConfig.consentScope);
    setLineChannelId(lineConfig.channelId);
    setLineClientSecret(lineConfig.clientSecret);
    setLineRedirectUri(lineConfig.redirectUri);
    setLineScope(lineConfig.scope);
    setEquipments(storedEquipments ? JSON.parse(storedEquipments) : []);
    setDisplayRecordTypeState(getDisplayedRecordType());
    setVerifiedRecords(getVerifiedRecords());
    if (savedSyncEnabled !== null) {
      setScheduledSyncEnabled(savedSyncEnabled === "true");
    }
    if (savedSyncTime) {
      setSyncTime(savedSyncTime);
    }

    void refreshConnectionState();
    void fetchLogs();
  }, []);

  const refreshConnectionState = async () => {
    const provider = getActiveProvider();
    setProviderStatus("checking");
    try {
      const status = await provider.getConnectionStatus();
      setProviderStatus(status.connected ? "connected" : "disconnected");
      if (status.lastSyncAt) {
        setProviderLastSync(new Date(status.lastSyncAt).toLocaleString("ko-KR"));
      } else {
        const samsungSync = getSamsungLastSyncAt();
        setProviderLastSync(samsungSync ? new Date(samsungSync).toLocaleString("ko-KR") : "");
      }
    } catch (error) {
      console.error("Failed to refresh provider state:", error);
      setProviderStatus("disconnected");
    }

    const gptEnabled = localStorage.getItem("openai_enabled") === "true" || !!localStorage.getItem("openai_api_key");
    const lastSync = localStorage.getItem("lastSync");
    setGptStatus(gptEnabled ? "connected" : "disconnected");
    setGptLastSync(lastSync ? new Date(lastSync).toLocaleString("ko-KR") : "");
    setRemainingTokens(gptEnabled ? Math.floor(Math.random() * 10000) + 5000 : 0);
  };

  const fetchLogs = async () => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      setLogs([]);
      return;
    }

    const { data } = await supabase
      .from("transfer_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);

    setLogs(data || []);
  };

  const handleProviderChange = (providerId: ProviderId) => {
    setActiveProvider(providerId);
    setStoredProviderId(providerId);
    toast({
      title: "연동 공급자를 변경했습니다",
      description: `${getProviderMeta(providerId).label}를 선택했습니다.`,
    });
    void refreshConnectionState();
  };

  const handleMockModeChange = (enabled: boolean) => {
    setMockHealthDataState(enabled);
    setMockHealthDataEnabled(enabled);
    toast({
      title: enabled ? "가데이터 모드를 켰습니다" : "가데이터 모드를 껐습니다",
      description: "홈, 기록, 비교 화면에 바로 반영됩니다.",
    });
    invalidateHealthData();
  };

  const handleDisplayToggle = (section: keyof DisplaySettings, key: string, checked: boolean) => {
    const next = {
      ...displaySettings,
      [section]: checked
        ? [...displaySettings[section], key]
        : displaySettings[section].filter((item) => item !== key),
    };
    setDisplaySettings(next);
    saveDisplaySettings(next);
  };

  const handleAddEquipment = () => {
    if (!equipmentName.trim()) {
      toast({ title: "장비 이름을 입력해 주세요.", variant: "destructive" });
      return;
    }

    const next = [
      ...equipments,
      {
        id: `equipment-${Date.now()}`,
        type: equipmentType,
        name: equipmentName.trim(),
        distanceKm: equipmentDistanceKm.trim() || "0",
      },
    ];
    setEquipments(next);
    localStorage.setItem("equipment_settings_v1", JSON.stringify(next));
    setEquipmentName("");
    setEquipmentDistanceKm("");
    toast({ title: "장비를 저장했습니다." });
  };

  const handleRecordSave = () => {
    if (!officialTime.trim()) {
      toast({ title: "공인 기록 시간을 입력해 주세요.", variant: "destructive" });
      return;
    }
    const next = saveVerifiedRecord({
      type: recordType,
      label: recordLabel.trim() || (recordType === "10k" ? "10K" : recordType === "half" ? "Half Marathon" : "Full Marathon"),
      officialTime: officialTime.trim(),
      certified: true,
    });
    setVerifiedRecords(next);
    if (recordType === "full") {
      const tag = buildRecordTag(next[0]);
      if (tag === "Sub4" || tag === "Sub3") {
        awardBadge({
          id: `record-${tag.toLowerCase()}`,
          name: tag,
          description: `${tag} 공인 기록을 등록했습니다.`,
          icon: "🏁",
        });
      }
    }
    toast({ title: "인증 기록을 저장했습니다." });
    setRecordLabel("");
    setOfficialTime("");
  };

  const handleDisplayRecordChange = (type: RecordType) => {
    setDisplayRecordTypeState(type);
    setDisplayedRecordType(type);
  };

  const handleDeleteEquipment = (id: string) => {
    const next = equipments.filter((item) => item.id !== id);
    setEquipments(next);
    localStorage.setItem("equipment_settings_v1", JSON.stringify(next));
  };

  const handleGarminConfigSave = () => {
    setGarminProviderConfig({ apiBaseUrl: garminApiBaseUrl, accessToken: garminAccessToken, userId: garminUserId });
    toast({ title: "Garmin 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleSamsungConfigSave = () => {
    localStorage.setItem("samsung_health_api_key", samsungApiKey);
    localStorage.setItem("samsung_health_client_id", samsungClientId);
    toast({ title: "Samsung Health 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleAppleConfigSave = () => {
    setAppleHealthProviderConfig({ appId: appleAppId, teamId: appleTeamId, redirectUri: appleRedirectUri });
    toast({ title: "Apple Health 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleStravaConfigSave = () => {
    setStravaProviderConfig({
      clientId: stravaClientId,
      clientSecret: stravaClientSecret,
      refreshToken: stravaRefreshToken,
      athleteId: stravaAthleteId,
    });
    toast({ title: "Strava 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleKakaoConfigSave = () => {
    setKakaoAuthConfig({
      restApiKey: kakaoRestApiKey,
      clientSecret: kakaoClientSecret,
      redirectUri: kakaoRedirectUri,
      consentScope: kakaoConsentScope,
    });
    toast({ title: "Kakao 로그인 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleLineConfigSave = () => {
    setLineAuthConfig({
      channelId: lineChannelId,
      clientSecret: lineClientSecret,
      redirectUri: lineRedirectUri,
      scope: lineScope,
    });
    toast({ title: "LINE 로그인 설정을 저장했습니다" });
    setApiDialog(null);
  };

  const handleScheduledSyncToggle = (enabled: boolean) => {
    setScheduledSyncEnabled(enabled);
    localStorage.setItem("scheduled_sync_enabled", enabled.toString());
  };

  const handleSyncTimeChange = (time: string) => {
    setSyncTime(time);
    localStorage.setItem("sync_time", time);
  };

  const syncHealthData = async () => {
    setIsSyncing(true);
    try {
      const healthData = await getActiveProvider().getTodayData();
      await createTransferLog("data_collection", "success", "건강 데이터를 수집했습니다.");

      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        throw new Error("프로필 정보가 없습니다.");
      }

      const { data: credentials } = await supabase
        .from("openai_credentials")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (credentials?.api_key) {
        const { error } = await supabase.functions.invoke("send-health-data", {
          body: { healthData },
        });
        if (error) {
          throw error;
        }
      }

      const now = new Date().toISOString();
      localStorage.setItem("lastSync", now);
      setSamsungLastSyncAt(now);
      setProviderLastSync(new Date(now).toLocaleString("ko-KR"));
      await createTransferLog("sync", "success", "건강 데이터 동기화에 성공했습니다.");
      invalidateHealthData();
      toast({
        title: "동기화를 완료했습니다",
        description: "홈, 기록, 비교 화면 데이터를 새로 불러옵니다.",
      });
      await fetchLogs();
      await refreshConnectionState();
    } catch (error) {
      console.error("Sync failed:", error);
      await createTransferLog("sync", "error", error instanceof Error ? error.message : "동기화 실패");
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
      await fetchLogs();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusChip = (status: "checking" | "connected" | "disconnected") => {
    if (status === "connected") {
      return (
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
          연결됨
        </div>
      );
    }
    if (status === "checking") {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          확인 중
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-rose-600">
        <XCircle className="h-5 w-5" />
        미연결
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <h1 className="text-3xl font-bold">설정</h1>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">일반</TabsTrigger>
            <TabsTrigger value="providers">연동</TabsTrigger>
            <TabsTrigger value="theme">테마</TabsTrigger>
            <TabsTrigger value="records">기록</TabsTrigger>
            <TabsTrigger value="display">표시 데이터</TabsTrigger>
            <TabsTrigger value="equipment">장비</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>기본 설정</CardTitle>
                <CardDescription>연동 공급자 선택과 가데이터 모드를 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>연동 공급자 선택</Label>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {providers.map((providerId) => (
                      <Button key={providerId} variant={activeProvider === providerId ? "default" : "outline"} onClick={() => handleProviderChange(providerId)}>
                        {getProviderMeta(providerId).label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="mock-mode">가데이터 사용</Label>
                    <p className="mt-1 text-sm text-muted-foreground">실연동이 준비되기 전에도 모든 화면을 mock 데이터로 채웁니다.</p>
                  </div>
                  <Switch id="mock-mode" checked={mockHealthDataEnabled} onCheckedChange={handleMockModeChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{getProviderMeta(activeProvider).label}</CardTitle>
                    <CardDescription>현재 선택된 연동 공급자의 연결 상태입니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getStatusChip(providerStatus)}
                    <div className="text-sm text-muted-foreground">
                      최근 동기화: {providerLastSync || "없음"}
                    </div>
                    <Button variant="outline" onClick={() => void refreshConnectionState()} className="w-full gap-2">
                      <RefreshCw className="h-4 w-4" />
                      상태 새로고침
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>GPT 연결</CardTitle>
                    <CardDescription>AI 코치와 자동 분석에 사용하는 GPT 연결 상태입니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getStatusChip(gptStatus)}
                    <div className="text-sm text-muted-foreground">
                      최근 확인: {gptLastSync || "없음"}
                    </div>
                    <div className="text-sm text-muted-foreground">예상 잔여 토큰: {remainingTokens.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>예약 동기화</CardTitle>
                  <CardDescription>지정한 시간에 자동 동기화를 수행합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="scheduled-sync">자동 동기화</Label>
                      <p className="mt-1 text-sm text-muted-foreground">매일 설정한 시간에 건강 데이터를 동기화합니다.</p>
                    </div>
                    <Switch id="scheduled-sync" checked={scheduledSyncEnabled} onCheckedChange={handleScheduledSyncToggle} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sync-time">동기화 시간</Label>
                    <Input id="sync-time" type="time" value={syncTime} onChange={(event) => handleSyncTimeChange(event.target.value)} />
                  </div>
                  <Button onClick={() => void syncHealthData()} disabled={isSyncing} className="w-full gap-2">
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "동기화 중..." : "지금 동기화"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API 설정</CardTitle>
                  <CardDescription>서비스별 API 값은 버튼을 눌러 열리는 창에서 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Dialog open={apiDialog === "garmin"} onOpenChange={(open) => setApiDialog(open ? "garmin" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Garmin API 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Garmin API 설정</DialogTitle>
                        <DialogDescription>승인받은 Garmin API 키와 사용자 정보를 입력합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={garminApiBaseUrl} onChange={(e) => setGarminApiBaseUrl(e.target.value)} placeholder="API Base URL" />
                        <Input value={garminAccessToken} onChange={(e) => setGarminAccessToken(e.target.value)} placeholder="Access Token" />
                        <Input value={garminUserId} onChange={(e) => setGarminUserId(e.target.value)} placeholder="User ID" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <Button onClick={handleGarminConfigSave}>저장</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={apiDialog === "samsung"} onOpenChange={(open) => setApiDialog(open ? "samsung" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Samsung Health 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Samsung Health API 설정</DialogTitle>
                        <DialogDescription>Samsung 개발자용 키가 있다면 저장해 둘 수 있습니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={samsungApiKey} onChange={(e) => setSamsungApiKey(e.target.value)} placeholder="API Key" />
                        <Input value={samsungClientId} onChange={(e) => setSamsungClientId(e.target.value)} placeholder="Client ID" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <Button onClick={handleSamsungConfigSave}>저장</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={apiDialog === "apple"} onOpenChange={(open) => setApiDialog(open ? "apple" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Apple Health 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apple Health API 설정</DialogTitle>
                        <DialogDescription>Apple Health 연결에 필요한 앱 식별 정보를 입력합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={appleAppId} onChange={(e) => setAppleAppId(e.target.value)} placeholder="App ID" />
                        <Input value={appleTeamId} onChange={(e) => setAppleTeamId(e.target.value)} placeholder="Team ID" />
                        <Input value={appleRedirectUri} onChange={(e) => setAppleRedirectUri(e.target.value)} placeholder="Redirect URI" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <Button onClick={handleAppleConfigSave}>저장</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={apiDialog === "strava"} onOpenChange={(open) => setApiDialog(open ? "strava" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Strava API 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Strava API 설정</DialogTitle>
                        <DialogDescription>Strava OAuth 설정값을 입력합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={stravaClientId} onChange={(e) => setStravaClientId(e.target.value)} placeholder="Client ID" />
                        <Input value={stravaClientSecret} onChange={(e) => setStravaClientSecret(e.target.value)} placeholder="Client Secret" />
                        <Input value={stravaRefreshToken} onChange={(e) => setStravaRefreshToken(e.target.value)} placeholder="Refresh Token" />
                        <Input value={stravaAthleteId} onChange={(e) => setStravaAthleteId(e.target.value)} placeholder="Athlete ID" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <Button onClick={handleStravaConfigSave}>저장</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={apiDialog === "kakao"} onOpenChange={(open) => setApiDialog(open ? "kakao" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Kakao 로그인 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Kakao 로그인 설정</DialogTitle>
                        <DialogDescription>REST API 키, Redirect URI, 동의항목을 입력합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={kakaoRestApiKey} onChange={(e) => setKakaoRestApiKey(e.target.value)} placeholder="REST API Key" />
                        <Input value={kakaoClientSecret} onChange={(e) => setKakaoClientSecret(e.target.value)} placeholder="Client Secret" />
                        <Input value={kakaoRedirectUri} onChange={(e) => setKakaoRedirectUri(e.target.value)} placeholder="Redirect URI" />
                        <Input value={kakaoConsentScope} onChange={(e) => setKakaoConsentScope(e.target.value)} placeholder="Scopes" />
                      </div>
                      <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={startKakaoLogin}>로그인 테스트</Button>
                          <Button onClick={handleKakaoConfigSave}>저장</Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={apiDialog === "line"} onOpenChange={(open) => setApiDialog(open ? "line" : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        LINE 로그인 설정
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>LINE 로그인 설정</DialogTitle>
                        <DialogDescription>Channel ID, Redirect URI, scope를 입력합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={lineChannelId} onChange={(e) => setLineChannelId(e.target.value)} placeholder="Channel ID" />
                        <Input value={lineClientSecret} onChange={(e) => setLineClientSecret(e.target.value)} placeholder="Client Secret" />
                        <Input value={lineRedirectUri} onChange={(e) => setLineRedirectUri(e.target.value)} placeholder="Redirect URI" />
                        <Input value={lineScope} onChange={(e) => setLineScope(e.target.value)} placeholder="Scope" />
                      </div>
                      <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={startLineLogin}>로그인 테스트</Button>
                          <Button onClick={handleLineConfigSave}>저장</Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>최근 연동 로그</CardTitle>
                  <CardDescription>최근 5개의 동기화 로그만 간단히 보여줍니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">표시할 로그가 없습니다.</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between rounded-xl border p-4">
                        <div className="min-w-0">
                          <div className="font-medium">{log.log_type}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{log.message}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("ko-KR")}</div>
                        </div>
                        <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {log.status}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="records">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>인증 기록 업로드</CardTitle>
                  <CardDescription>10K, 하프, 풀 기록을 등록하고 프로필에 표시할 기록을 선택합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(["10k", "half", "full"] as RecordType[]).map((type) => (
                      <Button key={type} variant={recordType === type ? "default" : "outline"} onClick={() => setRecordType(type)}>
                        {type === "10k" ? "10K" : type === "half" ? "하프" : "풀"}
                      </Button>
                    ))}
                  </div>
                  <Input value={recordLabel} onChange={(event) => setRecordLabel(event.target.value)} placeholder="표시 이름" />
                  <Input value={officialTime} onChange={(event) => setOfficialTime(event.target.value)} placeholder="공인 기록 예: 3:50:22" />
                  <Button onClick={handleRecordSave} className="w-full">
                    기록 저장
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>프로필 표기 기록</CardTitle>
                  <CardDescription>프로필 요약에 표시할 인증 기록을 선택합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(["10k", "half", "full"] as RecordType[]).map((type) => (
                      <Button key={type} variant={displayRecordType === type ? "default" : "outline"} onClick={() => handleDisplayRecordChange(type)}>
                        {type === "10k" ? "10K" : type === "half" ? "하프" : "풀"}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {verifiedRecords.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">등록된 인증 기록이 없습니다.</div>
                    ) : (
                      verifiedRecords.map((record) => (
                        <div key={record.id} className="rounded-xl border p-4">
                          <div className="font-medium">{record.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {record.officialTime} · {record.type} · {record.certified ? "인증됨" : "미인증"}
                          </div>
                          {buildRecordTag(record) ? <div className="mt-2 text-xs text-primary">{buildRecordTag(record)}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>테마 색상</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? "default" : "outline"}
                    onClick={() => setTheme(option.value)}
                    className="h-auto justify-start gap-3 px-4 py-4"
                  >
                    <div className="flex gap-1.5">
                      {option.colors.map((color) => (
                        <span
                          key={`${option.value}-${color}`}
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>{option.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display">
            <div className="space-y-6">
              {(["home", "history", "comparison"] as const).map((section) => (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle>{section === "home" ? "홈" : section === "history" ? "기록" : "비교"} 표시 설정</CardTitle>
                    <CardDescription>표출 가능한 데이터를 사용자가 직접 선택합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {displayOptions[section].map((option) => (
                      <label key={option.key} className="flex items-center gap-3 rounded-lg border p-3">
                        <Checkbox
                          checked={displaySettings[section].includes(option.key)}
                          onCheckedChange={(checked) => handleDisplayToggle(section, option.key, checked === true)}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>장비</CardTitle>
                <CardDescription>신발 등 장비별 누적 거리 파라미터를 입력합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Input value={equipmentType} onChange={(event) => setEquipmentType(event.target.value)} placeholder="장비 유형" />
                  <Input value={equipmentName} onChange={(event) => setEquipmentName(event.target.value)} placeholder="장비 이름" />
                  <Input value={equipmentDistanceKm} onChange={(event) => setEquipmentDistanceKm(event.target.value)} placeholder="누적 거리(km)" />
                  <Button onClick={handleAddEquipment} className="gap-2">
                    <Plus className="h-4 w-4" />
                    장비 추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {equipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">저장된 장비가 없습니다.</div>
                  ) : (
                    equipments.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.type} · {item.distanceKm} km
                          </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteEquipment(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4">
          <Button onClick={() => navigate("/account-settings", { state: { from: "/admin" } })} className="w-full gap-2">
            <Settings2 className="h-4 w-4" />
            사용자 계정 설정
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
