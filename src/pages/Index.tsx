import { useEffect, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/hooks/use-toast";
import { useTodayHealth } from "@/hooks/useHealthData";
import type { CheckPermissionsResult, HealthSummary } from "@/lib/healthConnect";
import { getActiveProvider } from "@/providers/shared";
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

interface CalculatedStats {
  totalBurned: number;
  totalConsumed: number;
  calorieDiff: number;
  totalExerciseDistance: number;
  totalExerciseTime: number;
}

const Index = () => {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionResult, setPermissionResult] = useState<CheckPermissionsResult | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const { toast } = useToast();
  const { data: todayData, isLoading, error } = useTodayHealth();

  useEffect(() => {
    void checkSamsungHealthPermission();
  }, []);

  const shouldShowPermissionDialog = () => {
    const dismissedUntil = localStorage.getItem("permission_dialog_dismissed_until");
    if (!dismissedUntil) {
      return true;
    }

    return Date.now() >= new Date(dismissedUntil).getTime();
  };

  const checkSamsungHealthPermission = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        if (shouldShowPermissionDialog()) {
          setShowPermissionDialog(true);
        }
        return;
      }

      const provider = getActiveProvider();
      const status = await provider.getConnectionStatus();
      if (status.connected) {
        setShowPermissionDialog(false);
        return;
      }

      if (shouldShowPermissionDialog()) {
        setShowPermissionDialog(true);
      }
    } catch (providerError) {
      console.error("Failed to check Samsung Health permission:", providerError);
    }
  };

  const handleGrantPermission = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        toast({
          title: "프로필 정보 없음",
          description: "먼저 계정 설정을 완료해주세요.",
          variant: "destructive",
        });
        return;
      }

      const provider = getActiveProvider();
      const available = await provider.isAvailable();
      if (!available) {
        toast({
          title: "Health Connect 미지원",
          description: "현재 기기에서는 Health Connect를 사용할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      await provider.connect();

      const deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await persistSamsungConnection(deviceId);
      await logSamsungTransferStatus("success", "Health Connect가 성공적으로 연결되었습니다.");

      toast({
        title: "연결 완료",
        description: "Health Connect가 성공적으로 연결되었습니다.",
      });

      setShowPermissionDialog(false);
      await requestNotificationPermission();
      await scheduleDailyNotification();
    } catch (grantError) {
      console.error("Error granting Health Connect permission:", grantError);
      await logSamsungTransferStatus(
        "error",
        grantError instanceof Error ? grantError.message : "Health Connect 연결 실패",
      ).catch((logError) => {
        console.error("Failed to write Samsung transfer log:", logError);
      });
      toast({
        title: "권한 설정 실패",
        description: "권한 설정 중 오류가 발생했습니다.",
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
            title: "삼성헬스 데이터 동기화",
            body: "오늘의 건강 데이터를 ChatGPT로 전송할 시간입니다.",
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

  const calculateStats = (data: NormalizedHealthData): CalculatedStats => {
    const totalBurned = (data.steps_data?.calories || 0)
      + (data.exercise_data?.reduce((sum, exercise) => sum + (exercise.calories || 0), 0) || 0);
    const totalConsumed = data?.nutrition_data?.calories || 0;
    const calorieDiff = totalConsumed - totalBurned;
    const totalExerciseDistance = data?.exercise_data?.reduce((sum, exercise) => sum + (exercise.distance || 0), 0) || 0;
    const totalExerciseTime = data?.exercise_data?.reduce((sum, exercise) => sum + (exercise.duration || 0), 0) || 0;

    return { totalBurned, totalConsumed, calorieDiff, totalExerciseDistance, totalExerciseTime };
  };

  const handleCheckPermissions = async () => {
    try {
      const result = await checkSamsungHealthBridgePermissions();
      setPermissionResult(result);
      toast({
        title: "권한 확인 완료",
        description: `모든 권한: ${result.hasAllPermissions ? "확인됨" : "필요"}`,
      });
    } catch (permissionError) {
      console.error("권한 확인 실패:", permissionError);
      toast({
        title: "권한 확인 실패",
        description: permissionError instanceof Error ? permissionError.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await getActiveProvider().connect();
      const status = await checkSamsungHealthBridgePermissions();
      setPermissionResult(status);
      toast({
        title: "권한 요청 완료",
        description: status.hasAllPermissions ? "모든 권한이 허용되었습니다." : "일부 권한이 아직 필요합니다.",
      });
    } catch (permissionError) {
      console.error("권한 요청 실패:", permissionError);
      toast({
        title: "권한 요청 실패",
        description: permissionError instanceof Error ? permissionError.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleOpenSettings = async () => {
    try {
      const result = await openSamsungHealthConnectSettings();
      toast({
        title: result.opened ? "설정 열림" : "설정 열기 실패",
        description: result.opened
          ? "Health Connect 설정을 열었습니다."
          : "설정을 열 수 없습니다.",
      });
    } catch (settingsError) {
      console.error("설정 열기 실패:", settingsError);
      toast({
        title: "설정 열기 실패",
        description: settingsError instanceof Error ? settingsError.message : "알 수 없는 오류",
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
        description: "Health Connect 데이터를 성공적으로 읽었습니다.",
      });
    } catch (summaryError) {
      console.error("데이터 읽기 실패:", summaryError);
      toast({
        title: "데이터 읽기 실패",
        description: summaryError instanceof Error ? summaryError.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const renderHealthCard = (data: NormalizedHealthData) => {
    if (!data) {
      return null;
    }

    const { totalBurned, totalConsumed, calorieDiff, totalExerciseDistance, totalExerciseTime } = calculateStats(data);

    return (
      <Card className="bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Today</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            마지막 동기화 {localStorage.getItem("lastSync") || "동기화 기록 없음"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg bg-card">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" />
              활동 요약
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">총 거리</p>
                <p className="text-2xl font-bold text-primary">{totalExerciseDistance.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 시간</p>
                <p className="text-2xl font-bold text-primary">{totalExerciseTime} 분</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-card">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" />
              칼로리 요약
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">총 소모</p>
                <p className="text-2xl font-bold text-primary">{totalBurned} kcal</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 섭취</p>
                <p className="text-2xl font-bold text-primary">{totalConsumed} kcal</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">차이</p>
                <p className={`text-2xl font-bold ${calorieDiff > 0 ? "text-primary" : "text-destructive"}`}>
                  {calorieDiff > 0 ? "+" : ""}
                  {calorieDiff} kcal
                </p>
              </div>
            </div>
          </div>

          {data.steps_data && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                걸음수
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>걸음수 {data.steps_data.count}</div>
                <div>거리 {data.steps_data.distance}</div>
                <div>칼로리 {data.steps_data.calories}</div>
                {data.steps_data.floors && <div>층수 {data.steps_data.floors}층</div>}
              </div>
            </div>
          )}

          {data.exercise_data && Array.isArray(data.exercise_data) && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                운동
              </h3>
              {data.exercise_data.map((exercise, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-2 text-sm border-t border-border/50 pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="col-span-2 font-semibold">{exercise.type}</div>
                  <div>시간 {exercise.duration}분</div>
                  <div>칼로리 {exercise.calories}kcal</div>
                  {exercise.distance && <div className="col-span-2">거리 {exercise.distance}km</div>}
                </div>
              ))}
            </div>
          )}

          {data.sleep_data && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Clock className="h-4 w-4" />
                수면
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>총 수면 {data.sleep_data.totalMinutes}분</div>
              </div>
            </div>
          )}

          {data.heart_rate && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                심박수
              </h3>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.heart_rate} bpm</p>
              </div>
            </div>
          )}

          {data.body_composition_data && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                신체 구성
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.body_composition_data.weight && <div>체중 {data.body_composition_data.weight}kg</div>}
                {data.body_composition_data.bodyFat && <div>체지방 {data.body_composition_data.bodyFat}%</div>}
              </div>
            </div>
          )}

          {data.nutrition_data && (
            <div className="space-y-2 p-3 rounded-lg bg-card">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                영양
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>칼로리 {data.nutrition_data.calories}kcal</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />

      <SamsungPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onConfirm={handleGrantPermission}
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <SamsungHealthDebugCard
          permissionResult={permissionResult}
          healthSummary={healthSummary}
          onCheckPermissions={handleCheckPermissions}
          onRequestPermissions={handleRequestPermissions}
          onOpenSettings={handleOpenSettings}
          onReadSummary={handleReadSummary}
        />

        {isLoading ? (
          <Card className="bg-accent/10">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">데이터 로딩 중...</p>
            </CardContent>
          </Card>
        ) : error || !todayData ? (
          <Card className="bg-accent/10">
            <CardHeader>
              <CardTitle>Samsung Health 연결 필요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                오늘의 건강 데이터를 보려면 Samsung Health 연결이 필요합니다.
              </p>
              <p className="text-sm text-muted-foreground">
                이 기능은 Android 네이티브 앱에서만 사용할 수 있습니다.
              </p>
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
