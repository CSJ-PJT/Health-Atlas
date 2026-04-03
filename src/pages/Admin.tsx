
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, KeyRound, Plus, RefreshCw, Settings2, Trash2, Upload, XCircle } from "lucide-react";
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
import { appleHealthProvider } from "@/providers/apple";
import { getGarminProviderConfig, setGarminProviderConfig } from "@/providers/garmin";
import { garminProvider } from "@/providers/garmin";
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
import { saveHealthSnapshot } from "@/providers/shared/services/healthDataRepository";
import { getSamsungLastSyncAt, setSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";
import { samsungProvider } from "@/providers/samsung/services/samsungProvider";
import { getStravaProviderConfig, setStravaProviderConfig } from "@/providers/strava";
import { stravaProvider } from "@/providers/strava";
import { startKakaoLogin } from "@/services/auth/kakaoAuth";
import { startLineLogin } from "@/services/auth/lineAuth";
import {
  getKakaoAuthConfig,
  getLineAuthConfig,
  setKakaoAuthConfig,
  setLineAuthConfig,
} from "@/services/auth/socialAuthStore";
import { awardBadge } from "@/services/achievementStore";
import { getDisplaySettings, saveDisplaySettings, type DisplaySettings } from "@/services/displaySettings";
import {
  deleteScopedUserData,
  deleteServerUserData,
  downloadServerUserDataExport,
  downloadUserDataExport,
  loadServerAuditEvents,
  loadServerDeletionRequests,
  submitServerDeletionRequest,
} from "@/services/privacy/userDataControl";
import { hasPendingOpenAiCredentials } from "@/services/security/openAiCredentialStore";
import {
  buildRecordTag,
  getDisplayedRecordType,
  getVerifiedRecords,
  saveVerifiedRecord,
  setDisplayedRecordType,
  type RecordType,
} from "@/services/verifiedRecordStore";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: string;
  message: string;
}

interface DataRequestEntry {
  id: string;
  request_type: string;
  status: string;
  details: string;
  created_at: string;
}

interface AuditEventEntry {
  id: string;
  category: string;
  status: string;
  message: string;
  created_at: string;
}

interface EquipmentEntry {
  id: string;
  type: string;
  name: string;
  distanceKm: string;
}

type ApiDialogId = "garmin" | "samsung" | "apple" | "strava" | "kakao" | "line";

const providers: ProviderId[] = ["samsung", "garmin", "apple-health", "strava"];
const equipmentTypes = ["러닝화", "트레일 러닝화", "하이킹화", "자전거", "스마트워치", "기타"];
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
const backgroundOptions = [
  { value: "286 36% 98%", label: "Soft Lavender" },
  { value: "240 40% 98%", label: "Cool Iris" },
  { value: "330 40% 98%", label: "Rose Mist" },
  { value: "198 42% 98%", label: "Ocean Air" },
  { value: "24 48% 98%", label: "Peach Light" },
  { value: "244 24% 8%", label: "Midnight Ink" },
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
    { key: "maxHeartRate", label: "최대 심박수" },
    { key: "cadence", label: "평균 케이던스" },
    { key: "maxCadence", label: "최대 케이던스" },
    { key: "vo2max", label: "VO2 Max" },
    { key: "elevationGain", label: "총 상승" },
    { key: "elevationLoss", label: "총 하강" },
    { key: "trainingEffectLabel", label: "기본 효과" },
    { key: "trainingEffectAerobic", label: "유산소 효과" },
    { key: "trainingEffectAnaerobic", label: "무산소 효과" },
    { key: "trainingLoad", label: "운동 부하" },
    { key: "estimatedSweatLossMl", label: "예상 수분 손실" },
    { key: "averageStrideLengthMeters", label: "보폭" },
    { key: "steps", label: "걸음 수" },
    { key: "calories", label: "칼로리" },
  ],
  comparison: [
    { key: "distanceKm", label: "거리" },
    { key: "durationMinutes", label: "시간" },
    { key: "avgPace", label: "평균 페이스" },
    { key: "bestPace", label: "최고 페이스" },
    { key: "averageSpeed", label: "평균 시속" },
    { key: "maxSpeed", label: "최고 시속" },
    { key: "avgHeartRate", label: "평균 심박수" },
    { key: "maxHeartRate", label: "최대 심박수" },
    { key: "cadence", label: "평균 케이던스" },
    { key: "maxCadence", label: "최대 케이던스" },
    { key: "vo2max", label: "VO2 Max" },
    { key: "elevationGain", label: "총 상승" },
    { key: "elevationLoss", label: "총 하강" },
    { key: "trainingEffectLabel", label: "기본 효과" },
    { key: "trainingEffectAerobic", label: "유산소 효과" },
    { key: "trainingEffectAnaerobic", label: "무산소 효과" },
    { key: "trainingLoad", label: "운동 부하" },
    { key: "estimatedSweatLossMl", label: "예상 수분 손실" },
    { key: "averageStrideLengthMeters", label: "보폭" },
    { key: "steps", label: "걸음 수" },
    { key: "calories", label: "칼로리" },
  ],
} as const;

function parseOfficialTimeFromText(raw: string) {
  const match = raw.match(/\b(\d{1,2}:\d{2}:\d{2})\b/);
  return match ? match[1] : "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function getDateStringWithOffset(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getRecentDateStrings(days: number) {
  return Array.from({ length: days }, (_, index) => getDateStringWithOffset(days - index - 1));
}

function getProviderInstance(providerId: ProviderId) {
  if (providerId === "samsung") return samsungProvider;
  if (providerId === "garmin") return garminProvider;
  if (providerId === "apple-health") return appleHealthProvider;
  return stravaProvider;
}

function getApiDialogTitle(type: ApiDialogId) {
  if (type === "garmin") return "Garmin API 설정";
  if (type === "samsung") return "Samsung Health API 설정";
  if (type === "apple") return "Apple Health API 설정";
  if (type === "strava") return "Strava API 설정";
  if (type === "kakao") return "Kakao 로그인 설정";
  return "LINE 로그인 설정";
}

function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const invalidateHealthData = useInvalidateHealthData();
  const recordFileInputRef = useRef<HTMLInputElement | null>(null);

  useDeviceBackNavigation({ fallback: "/admin", isRootPage: true });

  const [activeProvider, setActiveProvider] = useState<ProviderId>("samsung");
  const [mockHealthDataEnabled, setMockHealthDataState] = useState(true);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(getDisplaySettings());
  const [apiDialog, setApiDialog] = useState<ApiDialogId | null>(null);
  const [providerStatus, setProviderStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [providerLastSync, setProviderLastSync] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [providerIssues, setProviderIssues] = useState<string[]>([]);
  const [providerAuthExpiresAt, setProviderAuthExpiresAt] = useState("");
  const [gptStatus, setGptStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [gptLastSync, setGptLastSync] = useState("");
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const [isSyncing, setIsSyncing] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<ProviderId | null>(null);
  const [backfillingProviderId, setBackfillingProviderId] = useState<ProviderId | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DataRequestEntry[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventEntry[]>([]);
  const [garminApiBaseUrl, setGarminApiBaseUrl] = useState("");
  const [garminAccessToken, setGarminAccessToken] = useState("");
  const [garminUserId, setGarminUserId] = useState("");
  const [samsungApiKey, setSamsungApiKey] = useState(localStorage.getItem("samsung_health_api_key") || "");
  const [samsungClientId, setSamsungClientId] = useState(localStorage.getItem("samsung_health_client_id") || "");
  const [appleAppId, setAppleAppId] = useState("");
  const [appleTeamId, setAppleTeamId] = useState("");
  const [appleRedirectUri, setAppleRedirectUri] = useState("");
  const [appleApiBaseUrl, setAppleApiBaseUrl] = useState("");
  const [appleAccessToken, setAppleAccessToken] = useState("");
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
  const [equipmentType, setEquipmentType] = useState("러닝화");
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentDistanceKm, setEquipmentDistanceKm] = useState("");
  const [verifiedRecords, setVerifiedRecords] = useState(getVerifiedRecords());
  const [recordType, setRecordTypeState] = useState<RecordType>("full");
  const [recordLabel, setRecordLabel] = useState("");
  const [officialTime, setOfficialTime] = useState("");
  const [displayRecordType, setDisplayRecordTypeState] = useState<RecordType>(getDisplayedRecordType());
  const [backgroundTone, setBackgroundTone] = useState(localStorage.getItem("app_background_hsl") || "");

  const featuredRecord = useMemo(
    () => verifiedRecords.find((record) => record.type === displayRecordType && record.certified) || null,
    [displayRecordType, verifiedRecords],
  );

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
    setAppleApiBaseUrl(appleConfig.apiBaseUrl || "");
    setAppleAccessToken(appleConfig.accessToken || "");
    setStravaClientId(stravaConfig.clientId);
    setStravaClientSecret(stravaConfig.clientSecret);
    setStravaRefreshToken(stravaConfig.refreshToken);
    setStravaAthleteId(stravaConfig.athleteId);
    setKakaoRestApiKey(kakaoConfig.restApiKey);
    setKakaoClientSecret(kakaoConfig.clientSecret);
    setKakaoRedirectUri(kakaoConfig.redirectUri || "https://rhhealthcare.app/auth/kakao/callback");
    setKakaoConsentScope(kakaoConfig.consentScope || "profile_nickname,account_email,name,phone_number");
    setLineChannelId(lineConfig.channelId);
    setLineClientSecret(lineConfig.clientSecret);
    setLineRedirectUri(lineConfig.redirectUri || "https://rhhealthcare.app/auth/line/callback");
    setLineScope(lineConfig.scope || "profile openid email");
    if (savedSyncEnabled !== null) setScheduledSyncEnabled(savedSyncEnabled === "true");
    if (savedSyncTime) setSyncTime(savedSyncTime);
    if (storedEquipments) {
      try { setEquipments(JSON.parse(storedEquipments) as EquipmentEntry[]); } catch { setEquipments([]); }
    }
    void refreshConnectionState();
    void fetchLogs();
    void refreshServerPrivacyData();
  }, []);

  async function refreshServerPrivacyData() {
    setDeletionRequests(await loadServerDeletionRequests());
    setAuditEvents(await loadServerAuditEvents());
  }

  async function refreshConnectionState() {
    const provider = getActiveProvider();
    setProviderStatus("checking");
    try {
      const status = await provider.getConnectionStatus();
      setProviderStatus(status.connected ? "connected" : "disconnected");
      setProviderMessage(status.message || "");
      setProviderIssues(status.issues || []);
      setProviderAuthExpiresAt(status.authExpiresAt || "");
      if (status.lastSyncAt) setProviderLastSync(new Date(status.lastSyncAt).toLocaleString("ko-KR"));
      else {
        const samsungSync = getSamsungLastSyncAt();
        setProviderLastSync(samsungSync ? new Date(samsungSync).toLocaleString("ko-KR") : "");
      }
    } catch (error) {
      console.error("Failed to refresh provider state:", error);
      setProviderStatus("disconnected");
      setProviderMessage("연결 상태를 확인하지 못했습니다.");
      setProviderIssues([]);
      setProviderAuthExpiresAt("");
    }
    const hasOpenAi = hasPendingOpenAiCredentials() || localStorage.getItem("openai_enabled") === "true";
    const lastSync = localStorage.getItem("lastSync");
    setGptStatus(hasOpenAi ? "connected" : "disconnected");
    setGptLastSync(lastSync ? new Date(lastSync).toLocaleString("ko-KR") : "");
    setRemainingTokens(hasOpenAi ? Math.floor(Math.random() * 10000) + 5000 : 0);
  }

  async function fetchLogs() {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) { setLogs([]); return; }
    const { data } = await supabase.from("transfer_logs").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(5);
    setLogs((data as LogEntry[]) || []);
  }

  function handleProviderChange(providerId: ProviderId) {
    setActiveProvider(providerId);
    setStoredProviderId(providerId);
    toast({ title: "연동 공급자를 변경했습니다", description: `${getProviderMeta(providerId).label}를 선택했습니다.` });
    void refreshConnectionState();
  }

  function handleMockModeChange(enabled: boolean) {
    setMockHealthDataState(enabled);
    setMockHealthDataEnabled(enabled);
    invalidateHealthData();
    toast({ title: enabled ? "가데이터 모드를 켰습니다" : "가데이터 모드를 껐습니다", description: "홈, 기록, 비교 화면에 바로 반영됩니다." });
  }

  function handleDisplayToggle(section: keyof DisplaySettings, key: string, checked: boolean) {
    const next = { ...displaySettings, [section]: checked ? [...displaySettings[section], key] : displaySettings[section].filter((item) => item !== key) };
    setDisplaySettings(next);
    saveDisplaySettings(next);
  }

  function saveBackgroundTone(next: string) {
    setBackgroundTone(next);
    localStorage.setItem("app_background_hsl", next);
    document.documentElement.style.setProperty("--background", next);
    toast({ title: "배경 톤을 변경했습니다" });
  }

  function saveEquipments(next: EquipmentEntry[]) {
    setEquipments(next);
    localStorage.setItem("equipment_settings_v1", JSON.stringify(next));
  }

  function addEquipment() {
    if (!equipmentName.trim()) { toast({ title: "장비 이름을 입력해 주세요", variant: "destructive" }); return; }
    const next: EquipmentEntry[] = [{ id: `equipment-${Date.now()}`, type: equipmentType, name: equipmentName.trim(), distanceKm: equipmentDistanceKm.trim() || "0" }, ...equipments];
    saveEquipments(next);
    setEquipmentName("");
    setEquipmentDistanceKm("");
    toast({ title: "장비를 추가했습니다" });
  }

  function removeEquipment(id: string) { saveEquipments(equipments.filter((item) => item.id !== id)); }
  async function handleRecordFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsedTime = parseOfficialTimeFromText(text);
    if (!parsedTime) {
      toast({ title: "기록을 찾지 못했습니다", description: "파일 안에서 3:50:22 형식의 기록을 찾지 못했습니다.", variant: "destructive" });
      return;
    }
    setOfficialTime(parsedTime);
    setRecordLabel(file.name.replace(/\.[^.]+$/, ""));
    toast({ title: "파일에서 기록을 불러왔습니다", description: parsedTime });
  }

  function saveRecord() {
    if (!officialTime.trim()) { toast({ title: "공식 기록을 입력해 주세요", variant: "destructive" }); return; }
    const next = saveVerifiedRecord({ type: recordType, label: recordLabel.trim() || `${recordType.toUpperCase()} 인증 기록`, officialTime: officialTime.trim(), certified: true });
    setVerifiedRecords(next);
    setDisplayedRecordType(recordType);
    setDisplayRecordTypeState(recordType);
    if (recordType === "full" && officialTime.trim() < "04:00:00") awardBadge("badge-sub4", "Sub4 마라토너", "4시간 이내 풀코스 인증");
    toast({ title: "인증 기록을 저장했습니다", description: buildRecordTag(next[0]) || officialTime.trim() });
  }

  function saveProviderConfig(type: ApiDialogId) {
    if (type === "garmin") { setGarminProviderConfig({ apiBaseUrl: garminApiBaseUrl, accessToken: garminAccessToken, userId: garminUserId }); toast({ title: "Garmin 설정을 저장했습니다" }); }
    if (type === "samsung") { localStorage.setItem("samsung_health_api_key", samsungApiKey); localStorage.setItem("samsung_health_client_id", samsungClientId); toast({ title: "Samsung Health 설정을 저장했습니다" }); }
    if (type === "apple") { setAppleHealthProviderConfig({ appId: appleAppId, teamId: appleTeamId, redirectUri: appleRedirectUri, apiBaseUrl: appleApiBaseUrl, accessToken: appleAccessToken }); toast({ title: "Apple Health 설정을 저장했습니다" }); }
    if (type === "strava") { setStravaProviderConfig({ clientId: stravaClientId, clientSecret: stravaClientSecret, refreshToken: stravaRefreshToken, athleteId: stravaAthleteId }); toast({ title: "Strava 설정을 저장했습니다" }); }
    if (type === "kakao") { setKakaoAuthConfig({ restApiKey: kakaoRestApiKey, clientSecret: kakaoClientSecret, redirectUri: kakaoRedirectUri, consentScope: kakaoConsentScope }); toast({ title: "Kakao 로그인 설정을 저장했습니다" }); }
    if (type === "line") { setLineAuthConfig({ channelId: lineChannelId, clientSecret: lineClientSecret, redirectUri: lineRedirectUri, scope: lineScope }); toast({ title: "LINE 로그인 설정을 저장했습니다" }); }
    setApiDialog(null);
    void refreshConnectionState();
  }

  async function testProviderFetch(providerId: ProviderId) {
    setTestingProviderId(providerId);
    try {
      const provider = getProviderInstance(providerId);
      const healthData = await provider.getTodayData();
      await saveHealthSnapshot(healthData, provider.id, new Date().toISOString());
      await createTransferLog("provider_test", "success", `${provider.displayName} 실데이터 테스트 성공`);
      invalidateHealthData();
      toast({ title: `${provider.displayName} 테스트 성공`, description: "실데이터 fetch와 health_data 적재를 완료했습니다." });
      await refreshConnectionState();
      await fetchLogs();
    } catch (error) {
      console.error("Provider test failed:", error);
      await createTransferLog("provider_test", "error", error instanceof Error ? error.message : "provider test failed");
      toast({ title: `${getProviderMeta(providerId).label} 테스트 실패`, description: error instanceof Error ? error.message : "실데이터 테스트 중 오류가 발생했습니다.", variant: "destructive" });
      await fetchLogs();
    } finally { setTestingProviderId(null); }
  }

  async function backfillProviderData(providerId: ProviderId, days: number) {
    setBackfillingProviderId(providerId);
    try {
      const provider = getProviderInstance(providerId);
      const dateStrings = getRecentDateStrings(days);
      let savedCount = 0;
      let skippedCount = 0;
      const failures: string[] = [];
      const successes: string[] = [];
      for (const date of dateStrings) {
        try {
          const healthData = typeof provider.getDataForDate === "function" ? await provider.getDataForDate(date) : date === getDateStringWithOffset(0) ? await provider.getTodayData() : null;
          if (!healthData) { skippedCount += 1; continue; }
          await saveHealthSnapshot(healthData, provider.id, `${date}T12:00:00.000Z`);
          savedCount += 1;
          successes.push(date);
        } catch (error) {
          skippedCount += 1;
          const reason = error instanceof Error ? error.message : "unknown error";
          failures.push(`${date}: ${reason}`);
          await createTransferLog("provider_backfill_day", "error", `${provider.displayName} ${date} 실패 - ${reason}`);
        }
      }
      if (successes.length > 0) await createTransferLog("provider_backfill_day", "success", `${provider.displayName} 성공 날짜: ${successes.slice(0, 10).join(", ")}${successes.length > 10 ? " ..." : ""}`);
      await createTransferLog("provider_backfill", failures.length > 0 ? "error" : "success", `${provider.displayName} 최근 ${days}일 적재 완료 (성공 ${savedCount}건, 건너뜀 ${skippedCount}건)`);
      invalidateHealthData();
      toast({ title: `${provider.displayName} 최근 ${days}일 적재 완료`, description: failures.length > 0 ? `${savedCount}건 저장, ${skippedCount}건 건너뜀` : `${savedCount}일치를 저장했습니다.` });
      if (failures.length > 0) console.warn("Provider backfill skipped dates:", failures);
      await refreshConnectionState();
      await fetchLogs();
    } catch (error) {
      console.error("Provider backfill failed:", error);
      await createTransferLog("provider_backfill", "error", error instanceof Error ? error.message : "provider backfill failed");
      toast({ title: `${getProviderMeta(providerId).label} 기간 적재 실패`, description: error instanceof Error ? error.message : "기간 적재 중 오류가 발생했습니다.", variant: "destructive" });
      await fetchLogs();
    } finally { setBackfillingProviderId(null); }
  }

  function handleScheduledSyncToggle(enabled: boolean) { setScheduledSyncEnabled(enabled); localStorage.setItem("scheduled_sync_enabled", String(enabled)); }
  function handleSyncTimeChange(next: string) { setSyncTime(next); localStorage.setItem("sync_time", next); }

  async function syncHealthData() {
    setIsSyncing(true);
    try {
      const provider = getActiveProvider();
      const healthData = await provider.getTodayData();
      await createTransferLog("data_collection", "success", "건강 데이터를 수집했습니다.");
      await saveHealthSnapshot(healthData, provider.id, new Date().toISOString());
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) throw new Error("프로필 정보가 없습니다.");
      const { data: credentials } = await supabase.from("openai_credentials").select("*").eq("profile_id", profileId).maybeSingle();
      if (credentials?.api_key) {
        const { error } = await supabase.functions.invoke("send-health-data", { body: { healthData } });
        if (error) throw error;
      }
      const now = new Date().toISOString();
      localStorage.setItem("lastSync", now);
      setSamsungLastSyncAt(now);
      setProviderLastSync(new Date(now).toLocaleString("ko-KR"));
      await createTransferLog("sync", "success", "건강 데이터 동기화에 성공했습니다.");
      invalidateHealthData();
      toast({ title: "동기화를 완료했습니다", description: "홈, 기록, 비교 화면 데이터를 새로 불러옵니다." });
      await fetchLogs();
      await refreshConnectionState();
    } catch (error) {
      console.error("Sync failed:", error);
      await createTransferLog("sync", "error", error instanceof Error ? error.message : "동기화 실패");
      toast({ title: "동기화 실패", description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.", variant: "destructive" });
      await fetchLogs();
    } finally { setIsSyncing(false); }
  }

  async function handleLocalExport() { await downloadUserDataExport(); toast({ title: "로컬 데이터 내보내기를 시작했습니다" }); }
  async function handleServerExport() { await downloadServerUserDataExport(); toast({ title: "서버 데이터 내보내기를 시작했습니다" }); }
  async function handleLocalDelete() { deleteScopedUserData(); toast({ title: "로컬 데이터를 삭제했습니다" }); }
  async function handleServerDelete() { const success = await deleteServerUserData(); toast({ title: success ? "서버 데이터를 삭제했습니다" : "서버 데이터 삭제에 실패했습니다", variant: success ? "default" : "destructive" }); await refreshServerPrivacyData(); }
  async function handleDeletionRequest() { const success = await submitServerDeletionRequest("사용자가 서버 데이터 삭제 요청을 제출했습니다."); toast({ title: success ? "삭제 요청을 제출했습니다" : "삭제 요청 제출에 실패했습니다", variant: success ? "default" : "destructive" }); await refreshServerPrivacyData(); }

  function getStatusChip(status: "checking" | "connected" | "disconnected") {
    if (status === "connected") return <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" />연결됨</div>;
    if (status === "checking") return <div className="flex items-center gap-2 text-amber-600"><RefreshCw className="h-5 w-5 animate-spin" />확인 중</div>;
    return <div className="flex items-center gap-2 text-rose-600"><XCircle className="h-5 w-5" />미연결</div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-32">
      <Header showNav />
      <ScrollToTop />
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-8 pt-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">설정</h1>
          <p className="text-sm text-muted-foreground">연동, 기록, 장비, 데이터 권리와 테마를 한 곳에서 관리합니다.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 md:grid-cols-6">
            <TabsTrigger value="general">일반</TabsTrigger>
            <TabsTrigger value="providers">연동</TabsTrigger>
            <TabsTrigger value="theme">테마</TabsTrigger>
            <TabsTrigger value="records">기록</TabsTrigger>
            <TabsTrigger value="equipment">장비</TabsTrigger>
            <TabsTrigger value="data">데이터</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>기본 설정</CardTitle><CardDescription>현재 사용 중인 공급자와 가데이터 모드를 관리합니다.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3"><Label>연동 공급자 선택</Label><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{providers.map((providerId) => <Button key={providerId} variant={activeProvider === providerId ? "default" : "outline"} onClick={() => handleProviderChange(providerId)}>{getProviderMeta(providerId).label}</Button>)}</div></div>
                <div className="flex items-center justify-between rounded-xl border p-4"><div><Label htmlFor="mock-mode">가데이터 사용</Label><p className="mt-1 text-sm text-muted-foreground">실연동이 준비되지 않아도 모든 화면을 mock 데이터로 채웁니다.</p></div><Switch id="mock-mode" checked={mockHealthDataEnabled} onCheckedChange={handleMockModeChange} /></div>
                <div className="rounded-xl border p-4"><div className="text-sm font-medium">AI 연결 상태</div><div className="mt-3 flex items-center justify-between">{getStatusChip(gptStatus)}<div className="text-right text-xs text-muted-foreground"><div>최근 확인: {gptLastSync || "없음"}</div><div>예상 잔여 토큰: {remainingTokens.toLocaleString()}</div></div></div></div>
                <Button onClick={() => navigate("/account-settings", { state: { from: "/admin" } })} className="w-full gap-2"><Settings2 className="h-4 w-4" />사용자 계정 설정</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardHeader><CardTitle>{getProviderMeta(activeProvider).label}</CardTitle><CardDescription>현재 선택한 공급자의 연결 상태입니다.</CardDescription></CardHeader><CardContent className="space-y-3">{getStatusChip(providerStatus)}<div className="text-sm text-muted-foreground">최근 동기화: {providerLastSync || "없음"}</div>{providerAuthExpiresAt ? <div className="text-sm text-muted-foreground">인증 만료: {formatDateTime(providerAuthExpiresAt)}</div> : null}{providerMessage ? <div className="rounded-lg bg-muted p-3 text-sm">{providerMessage}</div> : null}{providerIssues.length > 0 ? <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><div className="mb-1 font-medium">확인할 항목</div><ul className="space-y-1">{providerIssues.map((issue) => <li key={issue}>- {issue}</li>)}</ul></div> : null}<Button variant="outline" onClick={() => void refreshConnectionState()} className="w-full gap-2"><RefreshCw className="h-4 w-4" />상태 새로고침</Button></CardContent></Card>
              <Card><CardHeader><CardTitle>예약 동기화</CardTitle><CardDescription>지정한 시간에 자동 동기화를 수행합니다.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between rounded-xl border p-4"><div><Label htmlFor="scheduled-sync">자동 동기화</Label><p className="mt-1 text-sm text-muted-foreground">매일 설정한 시간에 건강 데이터를 동기화합니다.</p></div><Switch id="scheduled-sync" checked={scheduledSyncEnabled} onCheckedChange={handleScheduledSyncToggle} /></div><div className="space-y-2"><Label htmlFor="sync-time">동기화 시간</Label><Input id="sync-time" type="time" value={syncTime} onChange={(event) => handleSyncTimeChange(event.target.value)} /></div><Button onClick={() => void syncHealthData()} disabled={isSyncing} className="w-full gap-2"><RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />{isSyncing ? "동기화 중..." : "지금 동기화"}</Button></CardContent></Card>
            </div>

            <Card><CardHeader><CardTitle>API 설정</CardTitle><CardDescription>서비스별 API 값은 별도 창에서 관리합니다.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(["garmin", "samsung", "apple", "strava", "kakao", "line"] as ApiDialogId[]).map((item) => <Dialog key={item} open={apiDialog === item} onOpenChange={(open) => setApiDialog(open ? item : null)}><DialogTrigger asChild><Button variant="outline" className="gap-2"><KeyRound className="h-4 w-4" />{getApiDialogTitle(item)}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{getApiDialogTitle(item)}</DialogTitle><DialogDescription>연동에 필요한 값을 저장합니다.</DialogDescription></DialogHeader>{item === "garmin" ? <div className="space-y-3"><Input value={garminApiBaseUrl} onChange={(e) => setGarminApiBaseUrl(e.target.value)} placeholder="API Base URL" /><Input value={garminAccessToken} onChange={(e) => setGarminAccessToken(e.target.value)} placeholder="Access Token" /><Input value={garminUserId} onChange={(e) => setGarminUserId(e.target.value)} placeholder="User ID" /></div> : null}{item === "samsung" ? <div className="space-y-3"><Input value={samsungApiKey} onChange={(e) => setSamsungApiKey(e.target.value)} placeholder="API Key" /><Input value={samsungClientId} onChange={(e) => setSamsungClientId(e.target.value)} placeholder="Client ID" /></div> : null}{item === "apple" ? <div className="space-y-3"><Input value={appleAppId} onChange={(e) => setAppleAppId(e.target.value)} placeholder="App ID" /><Input value={appleTeamId} onChange={(e) => setAppleTeamId(e.target.value)} placeholder="Team ID" /><Input value={appleRedirectUri} onChange={(e) => setAppleRedirectUri(e.target.value)} placeholder="Redirect URI" /><Input value={appleApiBaseUrl} onChange={(e) => setAppleApiBaseUrl(e.target.value)} placeholder="Bridge API Base URL" /><Input value={appleAccessToken} onChange={(e) => setAppleAccessToken(e.target.value)} placeholder="Bridge Access Token" /></div> : null}{item === "strava" ? <div className="space-y-3"><Input value={stravaClientId} onChange={(e) => setStravaClientId(e.target.value)} placeholder="Client ID" /><Input value={stravaClientSecret} onChange={(e) => setStravaClientSecret(e.target.value)} placeholder="Client Secret" /><Input value={stravaRefreshToken} onChange={(e) => setStravaRefreshToken(e.target.value)} placeholder="Refresh Token" /><Input value={stravaAthleteId} onChange={(e) => setStravaAthleteId(e.target.value)} placeholder="Athlete ID" /></div> : null}{item === "kakao" ? <div className="space-y-3"><Input value={kakaoRestApiKey} onChange={(e) => setKakaoRestApiKey(e.target.value)} placeholder="REST API Key" /><Input value={kakaoClientSecret} onChange={(e) => setKakaoClientSecret(e.target.value)} placeholder="Client Secret" /><Input value={kakaoRedirectUri} onChange={(e) => setKakaoRedirectUri(e.target.value)} placeholder="Redirect URI" /><Input value={kakaoConsentScope} onChange={(e) => setKakaoConsentScope(e.target.value)} placeholder="Scopes" /></div> : null}{item === "line" ? <div className="space-y-3"><Input value={lineChannelId} onChange={(e) => setLineChannelId(e.target.value)} placeholder="Channel ID" /><Input value={lineClientSecret} onChange={(e) => setLineClientSecret(e.target.value)} placeholder="Client Secret" /><Input value={lineRedirectUri} onChange={(e) => setLineRedirectUri(e.target.value)} placeholder="Redirect URI" /><Input value={lineScope} onChange={(e) => setLineScope(e.target.value)} placeholder="Scope" /></div> : null}<DialogFooter className="sm:justify-between"><Button variant="outline" onClick={() => setApiDialog(null)}>닫기</Button><div className="flex gap-2">{item === "kakao" ? <Button variant="outline" onClick={startKakaoLogin}>로그인 테스트</Button> : null}{item === "line" ? <Button variant="outline" onClick={startLineLogin}>로그인 테스트</Button> : null}<Button onClick={() => saveProviderConfig(item)}>저장</Button></div></DialogFooter></DialogContent></Dialog>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>기간 적재</CardTitle><CardDescription>공급자별 최근 7일 또는 30일 데이터를 한 번에 적재합니다.</CardDescription></CardHeader><CardContent className="space-y-4">{providers.map((providerId) => <div key={`${providerId}-backfill`} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center md:justify-between"><div className="font-medium">{getProviderMeta(providerId).label}</div><div className="flex gap-2"><Button variant="outline" disabled={backfillingProviderId !== null} onClick={() => void backfillProviderData(providerId, 7)}>{backfillingProviderId === providerId ? "적재 중..." : "최근 7일"}</Button><Button variant="outline" disabled={backfillingProviderId !== null} onClick={() => void backfillProviderData(providerId, 30)}>{backfillingProviderId === providerId ? "적재 중..." : "최근 30일"}</Button></div></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>실데이터 테스트</CardTitle><CardDescription>공급자별로 즉시 fetch 후 health_data 적재를 검증합니다.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{providers.map((providerId) => <Button key={providerId} variant="outline" className="gap-2" disabled={testingProviderId !== null} onClick={() => void testProviderFetch(providerId)}><RefreshCw className={`h-4 w-4 ${testingProviderId === providerId ? "animate-spin" : ""}`} />{testingProviderId === providerId ? "테스트 중..." : `${getProviderMeta(providerId).label} 테스트`}</Button>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>최근 연동 로그</CardTitle><CardDescription>최근 5개의 동기화 로그를 표시합니다.</CardDescription></CardHeader><CardContent className="space-y-3">{logs.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">표시할 로그가 없습니다.</div> : logs.map((log) => <div key={log.id} className="flex items-start justify-between rounded-xl border p-4"><div className="min-w-0"><div className="font-medium">{log.log_type}</div><div className="mt-1 text-sm text-muted-foreground">{log.message}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.created_at)}</div></div><div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4" />{log.status}</div></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <Card><CardHeader><CardTitle>테마</CardTitle><CardDescription>앱의 메인 색상을 선택합니다.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{themeOptions.map((option) => <button key={option.value} type="button" onClick={() => setTheme(option.value)} className={`rounded-2xl border p-4 text-left transition ${theme === option.value ? "border-primary ring-2 ring-primary/30" : "border-border"}`}><div className="mb-3 flex gap-2">{option.colors.map((color) => <span key={color} className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />)}</div><div className="font-medium">{option.label}</div></button>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>배경 톤</CardTitle><CardDescription>배경과 카드 대비에 보이는 배경 톤을 조정합니다.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{backgroundOptions.map((option) => <button key={option.value} type="button" onClick={() => saveBackgroundTone(option.value)} className={`rounded-2xl border p-4 text-left transition ${backgroundTone === option.value ? "border-primary ring-2 ring-primary/30" : "border-border"}`}><div className="mb-3 h-14 rounded-xl border" style={{ backgroundColor: `hsl(${option.value})` }} /><div className="font-medium">{option.label}</div></button>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card><CardHeader><CardTitle>인증 기록 업로드</CardTitle><CardDescription>기록 파일을 읽어 공식 시간을 저장하고 프로필에 표시할 기록을 선택합니다.</CardDescription></CardHeader><CardContent className="space-y-5"><input ref={recordFileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleRecordFileChange} /><div className="grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label>종목</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={recordType} onChange={(e) => setRecordTypeState(e.target.value as RecordType)}><option value="10k">10K</option><option value="half">하프</option><option value="full">풀</option></select></div><div className="space-y-2"><Label>표시할 대표 기록</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={displayRecordType} onChange={(e) => { const next = e.target.value as RecordType; setDisplayedRecordType(next); setDisplayRecordTypeState(next); }}><option value="10k">10K</option><option value="half">하프</option><option value="full">풀</option></select></div></div><div className="grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label>기록 이름</Label><Input value={recordLabel} onChange={(e) => setRecordLabel(e.target.value)} placeholder="예: 서울마라톤 2026" /></div><div className="space-y-2"><Label>공식 기록</Label><Input value={officialTime} onChange={(e) => setOfficialTime(e.target.value)} placeholder="예: 3:50:22" /></div></div><div className="flex flex-wrap gap-3"><Button variant="outline" className="gap-2" onClick={() => recordFileInputRef.current?.click()}><Upload className="h-4 w-4" />기록 파일 불러오기</Button><Button onClick={saveRecord}>기록 저장</Button></div><div className="rounded-xl border p-4 text-sm"><div className="font-medium">현재 프로필 대표 기록</div><div className="mt-2 text-muted-foreground">{buildRecordTag(featuredRecord) || "아직 선택한 인증 기록이 없습니다."}</div></div></CardContent></Card>
            <Card><CardHeader><CardTitle>저장한 인증 기록</CardTitle></CardHeader><CardContent className="space-y-3">{verifiedRecords.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">저장한 인증 기록이 없습니다.</div> : verifiedRecords.map((record) => <div key={record.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-4"><div><div className="font-medium">{record.label}</div><div className="text-sm text-muted-foreground">{record.type.toUpperCase()} · {record.officialTime} · {record.certified ? "인증 완료" : "미인증"}</div></div><div className="text-xs text-muted-foreground">{formatDateTime(record.uploadedAt)}</div></div></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <Card><CardHeader><CardTitle>장비 관리</CardTitle><CardDescription>러닝화, 자전거 같은 장비의 누적 거리를 기록합니다.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)}>{equipmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select><Input value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} placeholder="장비 이름" /><Input value={equipmentDistanceKm} onChange={(e) => setEquipmentDistanceKm(e.target.value)} placeholder="누적 거리 km" /></div><Button onClick={addEquipment} className="gap-2"><Plus className="h-4 w-4" />장비 추가</Button></CardContent></Card>
            <Card><CardHeader><CardTitle>등록한 장비</CardTitle></CardHeader><CardContent className="space-y-3">{equipments.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">등록한 장비가 없습니다.</div> : equipments.map((equipment) => <div key={equipment.id} className="flex items-center justify-between rounded-xl border p-4"><div><div className="font-medium">{equipment.name}</div><div className="text-sm text-muted-foreground">{equipment.type} · {equipment.distanceKm} km</div></div><Button variant="ghost" size="icon" onClick={() => removeEquipment(equipment.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card><CardHeader><CardTitle>표시 데이터</CardTitle><CardDescription>홈, 기록, 비교 화면에서 보일 항목을 직접 고릅니다.</CardDescription></CardHeader><CardContent className="space-y-6">{(["home", "history", "comparison"] as const).map((section) => <div key={section} className="space-y-3"><div className="font-medium">{section === "home" ? "홈" : section === "history" ? "기록" : "비교"}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{displayOptions[section].map((option) => <label key={option.key} className="flex items-center gap-3 rounded-xl border p-3"><Checkbox checked={displaySettings[section].includes(option.key)} onCheckedChange={(checked) => handleDisplayToggle(section, option.key, checked === true)} /><span className="text-sm">{option.label}</span></label>)}</div></div>)}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>데이터 내보내기 / 삭제</CardTitle><CardDescription>로컬 데이터와 서버 데이터를 개별적으로 관리할 수 있습니다.</CardDescription></CardHeader><CardContent className="grid gap-3"><Button variant="outline" onClick={() => void handleLocalExport()}>로컬 데이터 내보내기</Button><Button variant="outline" onClick={() => void handleServerExport()}>서버 데이터 내보내기</Button><Button variant="outline" onClick={() => void handleLocalDelete()}>로컬 데이터 삭제</Button><Button variant="destructive" onClick={() => void handleServerDelete()}>서버 데이터 삭제</Button><Button onClick={() => void handleDeletionRequest()}>서버 삭제 요청 제출</Button></CardContent></Card>
              <Card><CardHeader><CardTitle>삭제 요청 현황</CardTitle><CardDescription>서버에 접수된 데이터 삭제 요청입니다.</CardDescription></CardHeader><CardContent className="space-y-3">{deletionRequests.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">접수된 요청이 없습니다.</div> : deletionRequests.map((request) => <div key={request.id} className="rounded-xl border p-4"><div className="font-medium">{request.request_type} · {request.status}</div><div className="mt-1 text-sm text-muted-foreground">{request.details}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.created_at)}</div></div>)}</CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>감사 로그</CardTitle><CardDescription>내보내기, 삭제, 요청 제출 같은 민감 작업 이력을 표시합니다.</CardDescription></CardHeader><CardContent className="space-y-3">{auditEvents.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">감사 로그가 없습니다.</div> : auditEvents.map((event) => <div key={event.id} className="flex items-start justify-between rounded-xl border p-4"><div><div className="font-medium">{event.category} · {event.status}</div><div className="mt-1 text-sm text-muted-foreground">{event.message}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</div></div></div>)}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Admin;
