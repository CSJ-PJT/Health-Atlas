import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getAppleHealthProviderConfig, setAppleHealthProviderConfig } from "@/providers/apple";
import { getGarminProviderConfig, setGarminProviderConfig } from "@/providers/garmin";
import { getProviderMeta, getStoredProviderId, isMockHealthDataEnabled, setMockHealthDataEnabled, setStoredProviderId } from "@/providers/shared";
import type { ProviderId } from "@/providers/shared";
import { getStravaProviderConfig, setStravaProviderConfig } from "@/providers/strava";

const providers: ProviderId[] = ["samsung", "garmin", "apple-health", "strava"];

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeProvider, setActiveProvider] = useState<ProviderId>("samsung");
  const [mockHealthDataEnabled, setMockHealthDataState] = useState(true);

  const [garminOpen, setGarminOpen] = useState(true);
  const [appleOpen, setAppleOpen] = useState(false);
  const [stravaOpen, setStravaOpen] = useState(false);

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
    setMockHealthDataState(isMockHealthDataEnabled());
  }, []);

  const handleProviderChange = (providerId: ProviderId) => {
    setActiveProvider(providerId);
    setStoredProviderId(providerId);
    toast({
      title: "연동 공급자 변경 완료",
      description: `${getProviderMeta(providerId).label}를 선택했습니다.`,
    });
  };

  const handleMockModeChange = (enabled: boolean) => {
    setMockHealthDataState(enabled);
    setMockHealthDataEnabled(enabled);
    toast({
      title: enabled ? "가데이터 모드 활성화" : "가데이터 모드 비활성화",
      description: enabled ? "홈, 기록, 비교, 연동 화면에서 가데이터를 사용합니다." : "실제 provider 경로를 사용합니다.",
    });
  };

  const handleGarminConfigSave = () => {
    setGarminProviderConfig({
      apiBaseUrl: garminApiBaseUrl,
      accessToken: garminAccessToken,
      userId: garminUserId,
    });
    setGarminOpen(false);
    toast({ title: "Garmin 설정 저장", description: "Garmin API 설정을 저장했습니다." });
  };

  const handleAppleConfigSave = () => {
    setAppleHealthProviderConfig({
      appId: appleAppId,
      teamId: appleTeamId,
      redirectUri: appleRedirectUri,
    });
    setAppleOpen(false);
    toast({ title: "Apple Health 설정 저장", description: "Apple Health 설정을 저장했습니다." });
  };

  const handleStravaConfigSave = () => {
    setStravaProviderConfig({
      clientId: stravaClientId,
      clientSecret: stravaClientSecret,
      refreshToken: stravaRefreshToken,
      athleteId: stravaAthleteId,
    });
    setStravaOpen(false);
    toast({ title: "Strava 설정 저장", description: "Strava API 설정을 저장했습니다." });
  };

  const currentProviderMeta = getProviderMeta(activeProvider);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <h1 className="text-3xl font-bold">설정</h1>

        <Card>
          <CardHeader>
            <CardTitle>연동 공급자 선택</CardTitle>
            <CardDescription>Samsung Health, Garmin, Apple Health, Strava 중 현재 앱이 사용할 공급자를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {providers.map((providerId) => (
                <Button
                  key={providerId}
                  variant={activeProvider === providerId ? "default" : "outline"}
                  onClick={() => handleProviderChange(providerId)}
                >
                  {getProviderMeta(providerId).label}
                </Button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">현재 선택: {currentProviderMeta.label}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>가데이터 모드</CardTitle>
            <CardDescription>승인 전까지 mock payload로 화면 구성을 검증합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="mock-mode">가데이터 사용</Label>
              <p className="mt-1 text-sm text-muted-foreground">홈, 기록, 비교, 연동 화면에서 가데이터를 사용합니다.</p>
            </div>
            <Switch id="mock-mode" checked={mockHealthDataEnabled} onCheckedChange={handleMockModeChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>테마 변경</CardTitle>
            <CardDescription>화이트 테마와 가시성이 높은 블랙 테마를 전환합니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              화이트 테마
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              블랙 테마
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Garmin API 설정</CardTitle>
              <CardDescription>저장 후에는 이 섹션을 다시 열고 닫을 수 있습니다.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setGarminOpen((previous) => !previous)}>
              {garminOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {garminOpen && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="garmin-api-base-url">API Base URL</Label>
                <Input id="garmin-api-base-url" value={garminApiBaseUrl} onChange={(event) => setGarminApiBaseUrl(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="garmin-access-token">Access Token</Label>
                <Input id="garmin-access-token" value={garminAccessToken} onChange={(event) => setGarminAccessToken(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="garmin-user-id">Garmin User ID</Label>
                <Input id="garmin-user-id" value={garminUserId} onChange={(event) => setGarminUserId(event.target.value)} />
              </div>
              <Button onClick={handleGarminConfigSave} className="w-full">Garmin 설정 저장</Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Apple Health 설정</CardTitle>
              <CardDescription>HealthKit 승인 후 필요한 앱 식별값과 redirect URI를 저장합니다.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setAppleOpen((previous) => !previous)}>
              {appleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {appleOpen && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apple-app-id">App ID</Label>
                <Input id="apple-app-id" value={appleAppId} onChange={(event) => setAppleAppId(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apple-team-id">Team ID</Label>
                <Input id="apple-team-id" value={appleTeamId} onChange={(event) => setAppleTeamId(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apple-redirect-uri">Redirect URI</Label>
                <Input id="apple-redirect-uri" value={appleRedirectUri} onChange={(event) => setAppleRedirectUri(event.target.value)} />
              </div>
              <Button onClick={handleAppleConfigSave} className="w-full">Apple Health 설정 저장</Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Strava API 설정</CardTitle>
              <CardDescription>Client 정보와 refresh token을 저장합니다.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setStravaOpen((previous) => !previous)}>
              {stravaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {stravaOpen && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strava-client-id">Client ID</Label>
                <Input id="strava-client-id" value={stravaClientId} onChange={(event) => setStravaClientId(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strava-client-secret">Client Secret</Label>
                <Input id="strava-client-secret" value={stravaClientSecret} onChange={(event) => setStravaClientSecret(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strava-refresh-token">Refresh Token</Label>
                <Input id="strava-refresh-token" value={stravaRefreshToken} onChange={(event) => setStravaRefreshToken(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strava-athlete-id">Athlete ID</Label>
                <Input id="strava-athlete-id" value={stravaAthleteId} onChange={(event) => setStravaAthleteId(event.target.value)} />
              </div>
              <Button onClick={handleStravaConfigSave} className="w-full">Strava 설정 저장</Button>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Button onClick={() => navigate("/account-settings")} className="w-full">
            사용자 계정 설정
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
