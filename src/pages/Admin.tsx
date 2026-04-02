import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAppleHealthProviderConfig, setAppleHealthProviderConfig } from "@/providers/apple";
import { getGarminProviderConfig, setGarminProviderConfig } from "@/providers/garmin";
import {
  getProviderMeta,
  getStoredProviderId,
  isMockHealthDataEnabled,
  setMockHealthDataEnabled,
  setStoredProviderId,
} from "@/providers/shared";
import type { ProviderId } from "@/providers/shared";
import { getStravaProviderConfig, setStravaProviderConfig } from "@/providers/strava";
import { getDisplaySettings, saveDisplaySettings, type DisplaySettings } from "@/services/displaySettings";

const providers: ProviderId[] = ["samsung", "garmin", "apple-health", "strava"];

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
    { key: "elevationGain", label: "고도 상승" },
  ],
} as const;

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeProvider, setActiveProvider] = useState<ProviderId>("samsung");
  const [mockHealthDataEnabled, setMockHealthDataState] = useState(true);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(getDisplaySettings());

  const [garminApiBaseUrl, setGarminApiBaseUrl] = useState("");
  const [garminAccessToken, setGarminAccessToken] = useState("");
  const [garminUserId, setGarminUserId] = useState("");
  const [appleAppId, setAppleAppId] = useState("");
  const [appleTeamId, setAppleTeamId] = useState("");
  const [appleRedirectUri, setAppleRedirectUri] = useState("");
  const [stravaClientId, setStravaClientId] = useState("");
  const [stravaClientSecret, setStravaClientSecret] = useState("");
  const [stravaRefreshToken, setStravaRefreshToken] = useState("");
  const [stravaAthleteId, setStravaAthleteId] = useState("");

  useEffect(() => {
    const garminConfig = getGarminProviderConfig();
    const appleConfig = getAppleHealthProviderConfig();
    const stravaConfig = getStravaProviderConfig();
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
  }, []);

  const handleProviderChange = (providerId: ProviderId) => {
    setActiveProvider(providerId);
    setStoredProviderId(providerId);
    toast({ title: "연동 공급자 변경 완료", description: `${getProviderMeta(providerId).label}를 선택했습니다.` });
  };

  const handleMockModeChange = (enabled: boolean) => {
    setMockHealthDataState(enabled);
    setMockHealthDataEnabled(enabled);
    toast({ title: enabled ? "가데이터 모드 활성화" : "가데이터 모드 비활성화", description: "홈, 기록, 비교, 연동 화면에 적용됩니다." });
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

  const handleGarminConfigSave = () => {
    setGarminProviderConfig({ apiBaseUrl: garminApiBaseUrl, accessToken: garminAccessToken, userId: garminUserId });
    toast({ title: "Garmin 설정 저장", description: "Garmin API 설정을 저장했습니다." });
  };
  const handleAppleConfigSave = () => {
    setAppleHealthProviderConfig({ appId: appleAppId, teamId: appleTeamId, redirectUri: appleRedirectUri });
    toast({ title: "Apple Health 설정 저장", description: "Apple Health 설정을 저장했습니다." });
  };
  const handleStravaConfigSave = () => {
    setStravaProviderConfig({ clientId: stravaClientId, clientSecret: stravaClientSecret, refreshToken: stravaRefreshToken, athleteId: stravaAthleteId });
    toast({ title: "Strava 설정 저장", description: "Strava API 설정을 저장했습니다." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <h1 className="text-3xl font-bold">설정</h1>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">일반</TabsTrigger>
            <TabsTrigger value="providers">연동설정</TabsTrigger>
            <TabsTrigger value="theme">테마</TabsTrigger>
            <TabsTrigger value="display">표시 데이터</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>기본 설정</CardTitle>
                <CardDescription>공급자 선택과 mock 데이터 모드를 관리합니다.</CardDescription>
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
                    <p className="mt-1 text-sm text-muted-foreground">홈, 기록, 비교, 연동 화면에서 가데이터를 사용합니다.</p>
                  </div>
                  <Switch id="mock-mode" checked={mockHealthDataEnabled} onCheckedChange={handleMockModeChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Garmin API 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>API Base URL</Label><Input value={garminApiBaseUrl} onChange={(e) => setGarminApiBaseUrl(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Access Token</Label><Input value={garminAccessToken} onChange={(e) => setGarminAccessToken(e.target.value)} /></div>
                  <div className="space-y-2"><Label>User ID</Label><Input value={garminUserId} onChange={(e) => setGarminUserId(e.target.value)} /></div>
                  <Button onClick={handleGarminConfigSave} className="w-full">Garmin 설정 저장</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Apple Health 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>App ID</Label><Input value={appleAppId} onChange={(e) => setAppleAppId(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Team ID</Label><Input value={appleTeamId} onChange={(e) => setAppleTeamId(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Redirect URI</Label><Input value={appleRedirectUri} onChange={(e) => setAppleRedirectUri(e.target.value)} /></div>
                  <Button onClick={handleAppleConfigSave} className="w-full">Apple Health 설정 저장</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Strava API 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Client ID</Label><Input value={stravaClientId} onChange={(e) => setStravaClientId(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Client Secret</Label><Input value={stravaClientSecret} onChange={(e) => setStravaClientSecret(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Refresh Token</Label><Input value={stravaRefreshToken} onChange={(e) => setStravaRefreshToken(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Athlete ID</Label><Input value={stravaAthleteId} onChange={(e) => setStravaAthleteId(e.target.value)} /></div>
                  <Button onClick={handleStravaConfigSave} className="w-full">Strava 설정 저장</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>테마 변경</CardTitle>
                <CardDescription>화이트 테마와 블랙 테마 중 선택합니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>화이트 테마</Button>
                <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>블랙 테마</Button>
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
        </Tabs>

        <div className="flex flex-col gap-4">
          <Button onClick={() => navigate("/account-settings")} className="w-full">사용자 계정 설정</Button>
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">뒤로가기</Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
