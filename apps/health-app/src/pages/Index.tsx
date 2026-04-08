import { useEffect, useMemo, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Activity, Flame, Footprints, HeartPulse, Moon, Scale, Target, Timer } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MetricDonutChart } from "@/components/charts/MetricDonutChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { useToast } from "@/hooks/use-toast";
import { useTodayHealth } from "@/hooks/useHealthData";
import type { CheckPermissionsResult, HealthSummary } from "@/lib/healthConnect";
import { getActiveProvider, getProviderMeta, getStoredProviderId } from "@/providers/shared";
import type { NormalizedHealthData } from "@/providers/shared/types/provider";
import { SamsungHealthDebugCard } from "@/providers/samsung/components/SamsungHealthDebugCard";
import { SamsungPermissionDialog } from "@/providers/samsung/components/SamsungPermissionDialog";
import {
  checkSamsungHealthBridgePermissions,
  logSamsungTransferStatus,
  openSamsungHealthConnectSettings,
  readSamsungHealthSummary,
} from "@/providers/samsung/services/healthConnectClient";
import { persistSamsungConnection } from "@/providers/samsung/services/samsungConnectionStore";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import { buildAiRecommendation } from "@/services/aiCoach";
import { isDisplayMetricEnabled } from "@/services/displaySettings";
import { formatMinutesToClock } from "@/utils/formatDuration";
import type { HealthConnectPermissionStatus } from "@/lib/health-connect/types";

const formatPace = (minutesPerKm: number) => {
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

const toCheckPermissionsResult = (status: HealthConnectPermissionStatus): CheckPermissionsResult => ({
  hasAllPermissions: status.hasAllPermissions,
  hasAll: status.hasAll,
  granted: status.granted,
  missing: status.missing || [],
  requiredCount: status.requiredCount,
  grantedCount: status.grantedCount,
});

const formatStoredSync = () => {
  const stored = localStorage.getItem("lastSync");
  return stored ? new Date(stored).toLocaleString("ko-KR") : "기록 없음";
};

const Index = () => {
  useDeviceBackNavigation({ fallback: "/", isRootPage: true });
  const activeProviderId = getStoredProviderId();
  const providerMeta = getProviderMeta(activeProviderId);
  const activeProvider = getActiveProvider();
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
      setProviderErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
      return;
    }
    setProviderErrorMessage(null);
  }, [error]);

  const runningSession = useMemo<any>(() => {
    if (!todayData) {
      return null;
    }
    return todayData.exercise_data.find((exercise) => /run/i.test(String(exercise.exerciseType || exercise.type))) || null;
  }, [todayData]);

  const averagePace = useMemo(() => {
    if (!runningSession?.distance || !runningSession.duration) {
      return null;
    }
    return runningSession.duration / runningSession.distance;
  }, [runningSession]);

  const totalExerciseMinutes = useMemo(
    () => (todayData?.exercise_data || []).reduce((sum, exercise) => sum + Number(exercise.duration || 0), 0),
    [todayData],
  );

  const totalExerciseCalories = useMemo(
    () => (todayData?.exercise_data || []).reduce((sum, exercise) => sum + Number(exercise.calories || 0), 0),
    [todayData],
  );

  const aiRecommendation = useMemo(
    () => buildAiRecommendation(getMockHealthHistory(activeProviderId) as any[], new Date()),
    [activeProviderId],
  );

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
        setProviderErrorMessage("이 기기에서는 Health Connect를 사용할 수 없습니다.");
      } else if (status.requiresPermission) {
        setProviderErrorMessage("Health Connect 권한이 아직 허용되지 않았습니다.");
      }

      if (shouldShowPermissionDialog()) {
        setShowPermissionDialog(true);
      }
    } catch (providerError) {
      console.error("Failed to check provider permission:", providerError);
      setProviderErrorMessage(
        providerError instanceof Error ? providerError.message : `${providerMeta.label} 상태를 확인하지 못했습니다.`,
      );
    }
  };

  const handleGrantPermission = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        toast({
          title: "프로필 정보가 없습니다",
          description: "먼저 계정 설정을 완료해 주세요.",
          variant: "destructive",
        });
        return;
      }

      const available = await activeProvider.isAvailable();
      if (!available) {
        toast({
          title: "Health Connect를 사용할 수 없습니다",
          description: "현재 기기에서 지원되지 않습니다.",
          variant: "destructive",
        });
        return;
      }

      await activeProvider.connect();

      const deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await persistSamsungConnection(deviceId);
      await logSamsungTransferStatus("success", "Health Connect가 정상 연결되었습니다.");

      toast({
        title: "연결 완료",
        description: "Health Connect가 정상 연결되었습니다.",
      });

      setProviderErrorMessage(null);
      setShowPermissionDialog(false);
      await requestNotificationPermission();
      await scheduleDailyNotification();
    } catch (grantError) {
      console.error("Error granting Health Connect permission:", grantError);
      const message = grantError instanceof Error ? grantError.message : "Health Connect 연결에 실패했습니다.";
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
            title: "건강 데이터 확인",
            body: "오늘 기록과 추이를 확인할 시간입니다.",
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
      setPermissionResult(toCheckPermissionsResult(result));
      toast({
        title: "권한 확인 완료",
        description: result.hasAllPermissions ? "모든 권한이 허용되었습니다." : "일부 권한이 부족합니다.",
      });
    } catch (permissionError) {
      toast({
        title: "권한 확인 실패",
        description: permissionError instanceof Error ? permissionError.message : "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await activeProvider.connect();
      const status = await checkSamsungHealthBridgePermissions();
      setPermissionResult(toCheckPermissionsResult(status));
      toast({
        title: "권한 요청 완료",
        description: status.hasAllPermissions ? "모든 권한이 허용되었습니다." : "추가 권한 설정이 필요합니다.",
      });
    } catch (permissionError) {
      toast({
        title: "권한 요청 실패",
        description: permissionError instanceof Error ? permissionError.message : "오류가 발생했습니다.",
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
        description: settingsError instanceof Error ? settingsError.message : "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReadSummary = async () => {
    try {
      const result = await readSamsungHealthSummary();
      setHealthSummary(result as HealthSummary);
      toast({
        title: "데이터 읽기 완료",
        description: "Health Connect 요약 데이터를 읽었습니다.",
      });
    } catch (summaryError) {
      toast({
        title: "데이터 읽기 실패",
        description: summaryError instanceof Error ? summaryError.message : "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const renderDashboard = (data: NormalizedHealthData) => {
    const stepGoal = 12000;
    const sleepGoal = 480;
    const calorieGoal = 900;
    const exerciseGoalMinutes = 60;
    const hydrationAmount = Number(data.hydration.reduce((sum: number, item: any) => {
      if (typeof item?.milliliters === "number") {
        return sum + item.milliliters;
      }
      if (typeof item?.volumeLiters === "number") {
        return sum + Math.round(item.volumeLiters * 1000);
      }
      return sum;
    }, 0));

    const heroItems = [
      { label: "걸음 수", value: data.steps_data.count.toLocaleString() },
      { label: "운동 시간", value: `${totalExerciseMinutes}분` },
      { label: "운동 칼로리", value: `${totalExerciseCalories} kcal` },
      { label: "평균 심박", value: `${data.heart_rate} bpm` },
    ].filter((item) => {
      const mapping: Record<string, string> = {
        "걸음 수": "steps",
        "운동 시간": "highlights",
        "운동 칼로리": "calories",
        "평균 심박": "heart",
      };
      return isDisplayMetricEnabled("home", mapping[item.label] || "steps");
    });

    const goalCards = [
      {
        key: "steps",
        title: "걸음 목표",
        icon: Footprints,
        value: data.steps_data.count,
        total: stepGoal,
        color: "#8b5cf6",
        centerLabel: "달성률",
        centerValue: `${Math.round((data.steps_data.count / stepGoal) * 100)}%`,
        subLabel: `${data.steps_data.distance} km`,
      },
      {
        key: "sleep",
        title: "수면 목표",
        icon: Moon,
        value: data.sleep_data.totalMinutes,
        total: sleepGoal,
        color: "#06b6d4",
        centerLabel: "총 수면",
        centerValue: formatMinutesToClock(data.sleep_data.totalMinutes),
        subLabel: `${Math.round((data.sleep_data.totalMinutes / sleepGoal) * 100)}% 달성`,
      },
      {
        key: "calories",
        title: "칼로리 목표",
        icon: Flame,
        value: totalExerciseCalories,
        total: calorieGoal,
        color: "#14b8a6",
        centerLabel: "운동 칼로리",
        centerValue: `${totalExerciseCalories} kcal`,
        subLabel: `${Math.round((totalExerciseCalories / calorieGoal) * 100)}% 달성`,
      },
      {
        key: "highlights",
        title: "운동 시간 목표",
        icon: Target,
        value: totalExerciseMinutes,
        total: exerciseGoalMinutes,
        color: "#f97316",
        centerLabel: "활동 시간",
        centerValue: `${totalExerciseMinutes}분`,
        subLabel: `${Math.round((totalExerciseMinutes / exerciseGoalMinutes) * 100)}% 달성`,
      },
    ].filter((item) => isDisplayMetricEnabled("home", item.key));

    const lowerCards = [
      {
        key: "heart",
        icon: HeartPulse,
        title: "심박수",
        body: (
          <div className="space-y-1 text-sm">
            <div className="text-3xl font-bold text-primary">{data.heart_rate} bpm</div>
            <div className="text-muted-foreground">현재 평균 심박수 기준입니다.</div>
          </div>
        ),
      },
      {
        key: "body",
        icon: Scale,
        title: "신체 구성",
        body: (
          <div className="space-y-1 text-sm">
            <div>체중 {data.body_composition_data.weight} kg</div>
            <div>체지방 {data.body_composition_data.bodyFat} %</div>
          </div>
        ),
      },
      {
        key: "nutrition",
        icon: Flame,
        title: "영양",
        body: (
          <div className="space-y-1 text-sm">
            <div>섭취 칼로리 {data.nutrition_data.calories} kcal</div>
            <div>수분 {hydrationAmount} ml</div>
          </div>
        ),
      },
      {
        key: "running",
        icon: Activity,
        title: "러닝",
        body: (
          <div className="space-y-1 text-sm">
            <div>{runningSession ? runningSession.type : "기록 없음"}</div>
            <div>{averagePace ? `평균 페이스 ${formatPace(averagePace)}` : "평균 페이스 없음"}</div>
          </div>
        ),
      },
    ].filter((item) => isDisplayMetricEnabled("home", item.key));

    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/14 via-secondary to-accent/35">
          <div className="pointer-events-none absolute inset-x-12 top-8 h-24 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-4 bottom-6 h-28 w-28 rounded-full bg-accent/35 blur-3xl" />
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-sm font-medium text-primary">Dashboard</div>
                <h1 className="text-3xl font-bold tracking-tight">오늘의 AI 추천</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{aiRecommendation}</p>
                <p className="text-sm text-muted-foreground">마지막 동기화 {formatStoredSync()}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {heroItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border bg-background/85 p-4 backdrop-blur">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-xl font-bold">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {isDisplayMetricEnabled("home", "highlights") ? (
                  <div className="rounded-2xl border bg-background/85 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Activity className="h-4 w-4 text-primary" />
                      오늘 운동 하이라이트
                    </div>
                    <div className="mt-3 space-y-3">
                      {data.exercise_data.map((exercise, index) => (
                        <div key={`${exercise.type}-${index}`} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold">{exercise.type}</div>
                            <div className="text-xs text-muted-foreground">{exercise.duration}분</div>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>{exercise.distance ? `${exercise.distance} km` : "-"}</div>
                            <div>{exercise.calories} kcal</div>
                            <div>{runningSession === exercise && averagePace ? formatPace(averagePace) : "-"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isDisplayMetricEnabled("home", "body-balance") ? (
                  <div className="rounded-2xl border bg-background/85 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Timer className="h-4 w-4 text-primary" />
                      오늘 바디 밸런스
                    </div>
                    <div className="mt-3">
                      <MetricGrid
                        items={[
                          { label: "수면", value: formatMinutesToClock(data.sleep_data.totalMinutes) },
                          { label: "체중", value: `${data.body_composition_data.weight} kg` },
                          { label: "체지방", value: `${data.body_composition_data.bodyFat} %` },
                          { label: "영양", value: `${data.nutrition_data.calories} kcal` },
                          { label: "수분", value: `${hydrationAmount} ml` },
                          { label: "VO2 Max", value: Array.isArray(data.vo2max) && data.vo2max[0] ? `${(data.vo2max[0] as any).value}` : "-" },
                          { label: "심박", value: `${data.heart_rate} bpm` },
                          { label: "운동", value: `${data.exercise_data.length}건` },
                        ]}
                        columnsClassName="grid-cols-2 md:grid-cols-4"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Card className="border-0 bg-background/85 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">오늘 목표 대시보드</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {goalCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <MetricDonutChart
                        value={item.value}
                        total={item.total}
                        color={item.color}
                        centerLabel={item.centerLabel}
                        centerValue={item.centerValue}
                        subLabel={item.subLabel}
                        height={160}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {lowerCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{item.body}</CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_24%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
      <Header showNav={true} />
      <ScrollToTop />

      {isSamsungProvider ? (
        <SamsungPermissionDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog} onConfirm={handleGrantPermission} />
      ) : null}

      <div className="mx-auto max-w-6xl space-y-6 p-4">
        {isSamsungProvider ? (
          <SamsungHealthDebugCard
            permissionResult={permissionResult}
            healthSummary={healthSummary}
            onCheckPermissions={handleCheckPermissions}
            onRequestPermissions={handleRequestPermissions}
            onOpenSettings={handleOpenSettings}
            onReadSummary={handleReadSummary}
          />
        ) : null}

        {providerErrorMessage ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-destructive">현재 상태</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{providerErrorMessage}</CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">오늘 데이터를 불러오는 중입니다.</CardContent>
          </Card>
        ) : error || !todayData ? (
          <Card>
            <CardHeader>
              <CardTitle>{isSamsungProvider ? "Samsung Health 연결 필요" : `${providerMeta.label} 연동 준비 중`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {isSamsungProvider
                  ? "오늘 건강 데이터를 보려면 Samsung Health와 Health Connect 권한이 필요합니다."
                  : `${providerMeta.label} 설정이 준비되면 mock 또는 실데이터를 표시합니다.`}
              </p>
              <p>현재 상태: {providerErrorMessage || "연결 상태를 확인해 주세요."}</p>
            </CardContent>
          </Card>
        ) : (
          renderDashboard(todayData)
        )}
      </div>
    </div>
  );
};

export default Index;
