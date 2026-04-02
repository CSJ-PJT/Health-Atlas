import { useEffect, useMemo, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Activity, Clock, Footprints, HeartPulse, Moon, Scale } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTodayHealth } from "@/hooks/useHealthData";
import type { CheckPermissionsResult, HealthSummary } from "@/lib/healthConnect";
import { getActiveProvider, getStoredProviderId } from "@/providers/shared";
import { SamsungHealthDebugCard } from "@/providers/samsung/components/SamsungHealthDebugCard";
import { SamsungPermissionDialog } from "@/providers/samsung/components/SamsungPermissionDialog";
import {
  checkSamsungHealthBridgePermissions,
  logSamsungTransferStatus,
  openSamsungHealthConnectSettings,
  readSamsungHealthSummary,
} from "@/providers/samsung/services/healthConnectClient";
import { persistSamsungConnection } from "@/providers/samsung/services/samsungConnectionStore";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";

const formatPace = (minutesPerKm: number) => {
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

const formatStoredSync = () => {
  const stored = localStorage.getItem("lastSync");
  return stored ? new Date(stored).toLocaleString("ko-KR") : "기록 없음";
};

const Index = () => {
  const activeProviderId = getStoredProviderId();
  const activeProvider = getActiveProvider();
  const providerName = activeProvider.displayName;
  const isSamsungProvider = activeProviderId === "samsung";
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionResult, setPermissionResult] = useState<CheckPermissionsResult | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [providerErrorMessage, setProviderErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: todayData, isLoading, error } = useTodayHealth();

  useEffect(() => {
    void checkProviderPermission();
  }, [activeProviderId]);

  useEffect(() => {
    if (error) {
      setProviderErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류입니다.");
      return;
    }
    setProviderErrorMessage(null);
  }, [error]);

  const runningSession = useMemo(() => {
    if (!todayData) {
      return null;
    }
    return todayData.exercise_data.find((exercise) => /run/i.test(String(exercise.exerciseType || exercise.type)));
  }, [todayData]);

  const averagePace = useMemo(() => {
    if (!runningSession?.distance || !runningSession.duration) {
      return null;
    }
    return runningSession.duration / runningSession.distance;
  }, [runningSession]);

  const shouldShowPermissionDialog = () => {
    const dismissedUntil = localStorage.getItem("permission_dialog_dismissed_until");
    if (!dismissedUntil) {
      return true;
    }
    return Date.now() >= new Date(dismissedUntil).getTime();
  };

  const checkProviderPermission = async () => {
    try {
      if (!isSamsungProvider) {
        setShowPermissionDialog(false);
        setPermissionResult(null);
        setHealthSummary(null);
        return;
      }

      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        if (shouldShowPermissionDialog()) {
          setShowPermissionDialog(true);
        }
        return;
      }

      const status = await activeProvider.getConnectionStatus();
      if (status.connected) {
        setShowPermissionDialog(false);
        setProviderErrorMessage(null);
        return;
      }

      if (!status.available) {
        setProviderErrorMessage("이 기기에서 Health Connect를 사용할 수 없습니다.");
      } else if (status.requiresPermission) {
        setProviderErrorMessage("Health Connect 권한이 아직 허용되지 않았습니다.");
      }

      if (shouldShowPermissionDialog()) {
        setShowPermissionDialog(true);
      }
    } catch (providerError) {
      console.error("Failed to check provider permission:", providerError);
      setProviderErrorMessage(
        providerError instanceof Error ? providerError.message : `${providerName} 상태 확인에 실패했습니다.`,
      );
    }
  };

  const handleGrantPermission = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        toast({
          title: "프로필 정보 없음",
          description: "먼저 계정 설정을 완료해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const available = await activeProvider.isAvailable();
      if (!available) {
        toast({
          title: "Health Connect 미지원",
          description: "현재 기기에서는 Health Connect를 사용할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      await activeProvider.connect();

      const deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await persistSamsungConnection(deviceId);
      await logSamsungTransferStatus("success", "Health Connect가 성공적으로 연결되었습니다.");

      toast({
        title: "연결 완료",
        description: "Health Connect가 성공적으로 연결되었습니다.",
      });

      setProviderErrorMessage(null);
      setShowPermissionDialog(false);
      await requestNotificationPermission();
      await scheduleDailyNotification();
    } catch (grantError) {
      console.error("Error granting Health Connect permission:", grantError);
      const message = grantError instanceof Error ? grantError.message : "Health Connect 연결 실패";
      setProviderErrorMessage(message);
      await logSamsungTransferStatus("error", message).catch(() => undefined);
      toast({
        title: "권한 설정 실패",
        description: message,
        variant: "destructive",
      });
    }
  };

  const requestNotificationPermission = async () => {
    try {
      await LocalNotifications.requestPermissions();
    } catch (notificationError) {
      console.error("Error requesting notification permissions:", notificationError);
    }
  };

  const scheduleDailyNotification = async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(9, 0, 0, 0);

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1,
            title: "건강 데이터 동기화",
            body: "오늘 건강 데이터를 확인할 시간입니다.",
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: "day",
            },
          },
        ],
      });
    } catch (notificationError) {
      console.error("Error scheduling notification:", notificationError);
    }
  };

  const handleCheckPermissions = async () => {
    try {
      const result = await checkSamsungHealthBridgePermissions();
      setPermissionResult(result);
      toast({
        title: "권한 확인 완료",
        description: result.hasAllPermissions ? "모든 권한이 허용되었습니다." : "일부 권한이 부족합니다.",
      });
    } catch (permissionError) {
      toast({
        title: "권한 확인 실패",
        description: permissionError instanceof Error ? permissionError.message : "알 수 없는 오류입니다.",
        variant: "destructive",
      });
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await activeProvider.connect();
      const status = await checkSamsungHealthBridgePermissions();
      setPermissionResult(status);
      toast({
        title: "권한 요청 완료",
        description: status.hasAllPermissions ? "모든 권한이 허용되었습니다." : "일부 권한이 추가로 필요합니다.",
      });
    } catch (permissionError) {
      toast({
        title: "권한 요청 실패",
        description: permissionError instanceof Error ? permissionError.message : "알 수 없는 오류입니다.",
        variant: "destructive",
      });
    }
  };

  const handleOpenSettings = async () => {
    try {
      const result = await openSamsungHealthConnectSettings();
      toast({
        title: result.opened ? "설정 열기 완료" : "설정 열기 실패",
        description: result.opened ? "Health Connect 설정 화면을 열었습니다." : "설정 화면을 열 수 없습니다.",
      });
    } catch (settingsError) {
      toast({
        title: "설정 열기 실패",
        description: settingsError instanceof Error ? settingsError.message : "알 수 없는 오류입니다.",
        variant: "destructive",
      });
    }
  };

  const handleReadSummary = async () => {
    try {
      const result = await readSamsungHealthSummary();
      setHealthSummary(result);
      toast({
        title: "데이터 읽기 완료",
        description: "Health Connect 요약 데이터를 읽었습니다.",
      });
    } catch (summaryError) {
      toast({
        title: "데이터 읽기 실패",
        description: summaryError instanceof Error ? summaryError.message : "알 수 없는 오류입니다.",
        variant: "destructive",
      });
    }
  };

  const renderHealthCard = (data: NormalizedHealthData) => (
    <Card className="bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border-primary/20">
      <CardHeader>
        <CardTitle className="text-primary">{providerName} 오늘 데이터</CardTitle>
        <CardDescription>마지막 동기화 {formatStoredSync()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Footprints className="h-4 w-4" />
                걸음수
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>걸음수 {data.steps_data.count.toLocaleString()}</div>
              <div>거리 {data.steps_data.distance} km</div>
              <div>칼로리 {data.steps_data.calories} kcal</div>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                운동 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {data.exercise_data.map((exercise, index) => (
                <div key={`${exercise.type}-${index}`} className="rounded-md border p-3">
                  <div className="font-semibold">{exercise.type}</div>
                  <div>시간 {exercise.duration}분</div>
                  <div>칼로리 {exercise.calories} kcal</div>
                  {exercise.distance && <div>거리 {exercise.distance} km</div>}
                  {averagePace && runningSession === exercise && (
                    <div>평균 페이스 {formatPace(averagePace)}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4" />
                수면
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              총 수면 {data.sleep_data.totalMinutes}분
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                심박수
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-primary">
              {data.heart_rate} bpm
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4" />
                신체 구성
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>체중 {data.body_composition_data.weight} kg</div>
              <div>체지방 {data.body_composition_data.bodyFat} %</div>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                영양
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              칼로리 {data.nutrition_data.calories} kcal
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />

      {isSamsungProvider && (
        <SamsungPermissionDialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
          onConfirm={handleGrantPermission}
        />
      )}

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {isSamsungProvider && (
          <SamsungHealthDebugCard
            permissionResult={permissionResult}
            healthSummary={healthSummary}
            onCheckPermissions={handleCheckPermissions}
            onRequestPermissions={handleRequestPermissions}
            onOpenSettings={handleOpenSettings}
            onReadSummary={handleReadSummary}
          />
        )}

        {providerErrorMessage && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive text-base">현재 상태</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {providerErrorMessage}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card className="bg-accent/10">
            <CardContent className="py-12 text-center text-muted-foreground">
              오늘 데이터를 불러오는 중입니다.
            </CardContent>
          </Card>
        ) : error || !todayData ? (
          <Card className="bg-accent/10">
            <CardHeader>
              <CardTitle>{isSamsungProvider ? "Samsung Health 연결 필요" : "Garmin 연동 준비 중"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {isSamsungProvider
                  ? "오늘의 건강 데이터를 보려면 Samsung Health와 Health Connect 권한이 필요합니다."
                  : "Garmin 설정을 완료하면 Garmin mock 또는 공식 백엔드 데이터를 표출할 수 있습니다."}
              </p>
              <p>현재 상태: {providerErrorMessage || "연결 상태를 확인해 주세요."}</p>
            </CardContent>
          </Card>
        ) : (
          renderHealthCard(todayData)
        )}
      </div>
    </div>
  );
};

export default Index;
