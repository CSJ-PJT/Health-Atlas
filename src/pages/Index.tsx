import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Activity, Clock } from "lucide-react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { HealthConnect as HealthConnectNew } from "@/lib/healthConnect";
import { checkHealthConnectAvailability, checkPermissions, requestPermissions, getTodayHealthData, type TodaySnapshot } from "@/lib/health-connect";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [todayData, setTodayData] = useState<any>(null);
  const [weekData, setWeekData] = useState<any>(null);
  const [monthData, setMonthData] = useState<any>(null);
  const [yearData, setYearData] = useState<any>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const { toast } = useToast();

  // New Health Connect Test States
  const [permissionResult, setPermissionResult] = useState<any>(null);
  const [healthSummary, setHealthSummary] = useState<any>(null);

  useEffect(() => {
    checkSamsungHealthPermission();
    
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    loadTodayData();
  }, []);

  const shouldShowPermissionDialog = (): boolean => {
    // Check if dialog was dismissed for 24 hours
    const dismissedUntil = localStorage.getItem("permission_dialog_dismissed_until");
    if (dismissedUntil) {
      const dismissedTime = new Date(dismissedUntil).getTime();
      if (Date.now() < dismissedTime) {
        return false;
      }
    }
    return true;
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

      const isNative = (window as any).Capacitor?.isNativePlatform();
      if (!isNative) return;

      // Check Health Connect permission status
      const permStatus = await checkPermissions();
      if (permStatus.hasAll) {
        // Permission granted, hide dialog
        setShowPermissionDialog(false);
        return;
      }

      // Permission not granted, show dialog if allowed
      if (shouldShowPermissionDialog()) {
        setShowPermissionDialog(true);
      }
    } catch (error) {
      console.error("Failed to check Samsung Health permission:", error);
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

      // Check if Health Connect is available
      const available = await checkHealthConnectAvailability();
      if (!available) {
        toast({
          title: "Health Connect 미지원",
          description: "이 기기는 Health Connect를 지원하지 않습니다.",
          variant: "destructive",
        });
        return;
      }

      // Request permissions
      const granted = await requestPermissions();
      if (!granted) {
        toast({
          title: "권한 필요",
          description: "Health Connect 권한을 승인해주세요.",
          variant: "destructive",
        });
        return;
      }

      // Generate a unique device ID
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update profile with Samsung Health connection info
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          samsung_health_device_id: deviceId,
          samsung_health_connected_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (updateError) throw updateError;

      // Save to localStorage
      localStorage.setItem("samsung_health_device_id", deviceId);
      localStorage.setItem("samsung_health_connected", "true");

      // Log successful connection
      await logTransferStatus("Samsung Health", "success", "Health Connect가 성공적으로 연동되었습니다.");

      toast({
        title: "연동 완료",
        description: "Health Connect와 성공적으로 연동되었습니다.",
      });

      setShowPermissionDialog(false);

      // Request notification permissions
      await requestNotificationPermission();
      await scheduleDailyNotification();

      // Load initial data
      await loadTodayData();
    } catch (error) {
      console.error("Error granting Health Connect permission:", error);
      await logTransferStatus("Samsung Health", "error", error instanceof Error ? error.message : "Health Connect 연동 실패");
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
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
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
            title: '삼성헬스 데이터 동기화',
            body: '오늘의 건강 데이터를 ChatGPT로 전송할 시간입니다.',
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: 'day',
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const logTransferStatus = async (logType: string, status: "success" | "error" | "pending", message: string) => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) return;

      await supabase.from('transfer_logs').insert({
        profile_id: profileId,
        log_type: logType,
        status,
        message,
      });
    } catch (error) {
      console.error("Failed to log transfer status:", error);
    }
  };

  const collectSamsungHealthData = async () => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      throw new Error("프로필 정보를 찾을 수 없습니다.");
    }

    // Check Health Connect permission status
    const permStatus = await checkPermissions();
    if (!permStatus.hasAll) {
      throw new Error("Health Connect 권한이 필요합니다.");
    }

    await logTransferStatus("data_collection", "pending", "Health Connect 데이터 수집 시작");

    try {
      // Use new Kotlin native plugin
      const snapshot: TodaySnapshot = await getTodayHealthData();

      await logTransferStatus("data_collection", "success", "Health Connect 데이터 수집 완료");

      // Calculate average heart rate from samples
      const avgHeartRate = snapshot.heartRate.length > 0
        ? Math.round(snapshot.heartRate.reduce((sum, hr) => sum + hr.bpm, 0) / snapshot.heartRate.length)
        : 0;

      // Get latest weight and body fat
      const latestWeight = snapshot.weight.length > 0 ? snapshot.weight[snapshot.weight.length - 1].weightKg : 0;
      const latestBodyFat = snapshot.bodyFat.length > 0 ? snapshot.bodyFat[snapshot.bodyFat.length - 1].percentage : 0;

      // Convert distance from meters to km
      const distanceKm = (snapshot.aggregate.distanceMeter / 1000).toFixed(2);

      // Map exercise sessions to exercise data format
      const exerciseData = snapshot.exerciseSessions.map(session => ({
        type: session.title || "운동",
        duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
        calories: 0, // Kotlin doesn't provide per-session calories
        exerciseType: session.exerciseType,
      }));

      // Calculate total nutrition calories
      const totalNutritionCalories = snapshot.nutrition.reduce((sum, n) => sum + n.energyKcal, 0);

      return {
        steps_data: {
          count: snapshot.aggregate.steps,
          distance: distanceKm,
          calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
        },
        exercise_data: exerciseData.length > 0 ? exerciseData : [{
          type: "운동",
          duration: snapshot.aggregate.exerciseDurationMinutes,
          calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
        }],
        sleep_data: {
          totalMinutes: snapshot.aggregate.sleepDurationMinutes,
        },
        body_composition_data: {
          weight: latestWeight,
          bodyFat: latestBodyFat,
        },
        nutrition_data: {
          calories: Math.round(totalNutritionCalories),
          nutrition: snapshot.nutrition,
        },
        heart_rate: avgHeartRate,
        hydration: snapshot.hydration,
        vo2max: snapshot.vo2max,
      };
    } catch (error) {
      await logTransferStatus("data_collection", "error", `데이터 수집 실패: ${error}`);
      throw error;
    }
  };

  const loadTodayData = async () => {
    try {
      const data = await collectSamsungHealthData();
      setTodayData(data);
      // Mock data for week, month, year (실제로는 네이티브에서 기간별로 가져와야 함)
      setWeekData(data);
      setMonthData(data);
      setYearData(data);
    } catch (error) {
      console.error("Failed to load today data:", error);
      setTodayData(null);
      setWeekData(null);
      setMonthData(null);
      setYearData(null);
    }
  };

  const syncHealthData = async () => {
    setIsSyncing(true);
    
    try {
      // First, collect Samsung Health data
      const healthData = await collectSamsungHealthData();
      
      if (!healthData) {
        throw new Error("삼성헬스 데이터를 가져올 수 없습니다. 삼성헬스 연동을 먼저 완료해주세요.");
      }

      // Check GPT connection before sending
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        throw new Error("사용자 프로필을 찾을 수 없습니다. Setup을 다시 진행해주세요.");
      }

      const { data: credentials } = await supabase
        .from("openai_credentials")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (!credentials || !credentials.api_key) {
        throw new Error("GPT 연동이 필요합니다. Setup 메뉴에서 OpenAI API Key를 설정해주세요.");
      }

      // Log GPT connection attempt
      await logTransferStatus("GPT 연동", "pending", "GPT로 데이터 전송 시도 중...");
      
      // Send data to GPT
      const { data, error } = await supabase.functions.invoke('send-health-data', {
        body: { healthData }
      });

      if (error) {
        await logTransferStatus("GPT 연동", "error", `GPT 전송 실패: ${error.message}`);
        throw error;
      }

      // Log successful GPT transfer
      await logTransferStatus("GPT 연동", "success", "건강 데이터가 GPT로 성공적으로 전송되었습니다.");

      const now = new Date().toLocaleString('ko-KR');
      setLastSync(now);
      localStorage.setItem('lastSync', now);

      toast({
        title: "동기화 완료",
        description: "건강 데이터가 GPT로 성공적으로 전송되었습니다.",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "데이터 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const calculateStats = (data: any) => {
    const totalBurned = data ? (
      (data.steps_data?.calories || 0) + 
      (data.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.calories || 0), 0) || 0)
    ) : 0;
    const totalConsumed = data?.nutrition_data?.calories || 0;
    const calorieDiff = totalConsumed - totalBurned;
    const totalExerciseDistance = data?.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.distance || 0), 0) || 0;
    const totalExerciseTime = data?.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.duration || 0), 0) || 0;

    return { totalBurned, totalConsumed, calorieDiff, totalExerciseDistance, totalExerciseTime };
  };

  const handleCheckPermissions = async () => {
    try {
      const result = await HealthConnectNew.checkPermissions();
      setPermissionResult(result);
      toast({
        title: "권한 확인 완료",
        description: `모든 권한: ${result.hasAllPermissions ? '승인됨' : '필요'}`,
      });
    } catch (error) {
      console.error("권한 확인 실패:", error);
      toast({
        title: "권한 확인 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const result = await HealthConnectNew.requestPermissions();
      
      if (result.hasAllPermissions) {
        toast({
          title: "권한 요청 완료",
          description: "모든 권한이 허용되었습니다.",
        });
      } else {
        toast({
          title: "권한 일부 미허용",
          description: `허용 안 된 권한: ${result.missing.join(', ')}`,
          variant: "destructive",
        });
      }

      // 권한 상태 업데이트
      const status = await HealthConnectNew.checkPermissions();
      setPermissionResult(status);
    } catch (error) {
      console.error("권한 요청 실패:", error);
      toast({
        title: "권한 요청 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleOpenSettings = async () => {
    try {
      const result = await HealthConnectNew.openHealthConnectSettings();
      toast({
        title: result.opened ? "설정 열림" : "설정 열기 실패",
        description: result.opened ? "Health Connect 설정이 열렸습니다." : "설정을 열 수 없습니다.",
      });
    } catch (error) {
      console.error("설정 열기 실패:", error);
      toast({
        title: "설정 열기 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const handleReadSummary = async () => {
    try {
      const result = await HealthConnectNew.readSummary();
      setHealthSummary(result);
      toast({
        title: "데이터 읽기 완료",
        description: "Health Connect 데이터를 성공적으로 읽었습니다.",
      });
    } catch (error) {
      console.error("데이터 읽기 실패:", error);
      toast({
        title: "데이터 읽기 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    }
  };

  const renderHealthCard = (data: any, period: string) => {
    if (!data) return null;
    
    const { totalBurned, totalConsumed, calorieDiff, totalExerciseDistance, totalExerciseTime } = calculateStats(data);

    return (
      <Card className="bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">{period}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg bg-card">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" />
              운동 요약
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
                <p className={`text-2xl font-bold ${calorieDiff > 0 ? 'text-primary' : 'text-destructive'}`}>
                  {calorieDiff > 0 ? '+' : ''}{calorieDiff} kcal
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
              {data.exercise_data.map((ex: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-2 text-sm border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
                  <div className="col-span-2 font-semibold">{ex.type}</div>
                  <div>시간 {ex.duration}분</div>
                  <div>칼로리 {ex.calories}kcal</div>
                  {ex.distance && <div className="col-span-2">거리 {ex.distance}km</div>}
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
                <div>수면 점수 {data.sleep_data.score || 'N/A'}</div>
                {data.sleep_data.deepSleepMinutes && (
                  <>
                    <div>깊은 수면 {data.sleep_data.deepSleepMinutes}분</div>
                    <div>얕은 수면 {data.sleep_data.lightSleepMinutes}분</div>
                    <div>렘 수면 {data.sleep_data.remSleepMinutes}분</div>
                    <div>깬 시간 {data.sleep_data.awakeMinutes}분</div>
                  </>
                )}
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
                {data.body_composition_data.bodyFat && <div>체지방률 {data.body_composition_data.bodyFat}%</div>}
                {data.body_composition_data.muscleMass && <div>근육량 {data.body_composition_data.muscleMass}kg</div>}
                {data.body_composition_data.bmi && <div>BMI {data.body_composition_data.bmi}</div>}
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
                <div>탄수화물 {data.nutrition_data.carbs}g</div>
                <div>단백질 {data.nutrition_data.protein}g</div>
                <div>지방 {data.nutrition_data.fat}g</div>
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
      
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Samsung Health 및 앱 권한 필요</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">건강 데이터를 수집하려면 다음 권한이 필요합니다:</p>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium">필수 권한:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>건강, 피트니스, 웰니스 (Samsung Health 데이터)</li>
                  <li>신체 활동 (활동 추적)</li>
                  <li>위치 (운동 경로 기록)</li>
                </ul>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium">선택 권한:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>사진 및 동영상 (프로필 이미지)</li>
                  <li>카메라 (프로필 사진 촬영)</li>
                  <li>알림 (동기화 알림)</li>
                </ul>
              </div>
              
              <p className="text-sm font-medium mt-4">권한 설정 방법:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>휴대폰 설정 &gt; 앱 &gt; RH Healthcare</li>
                <li>권한 탭에서 필요한 권한 허용</li>
                <li>Samsung Health 앱 &gt; 설정 &gt; 연결된 앱</li>
                <li>'RH Healthcare' 찾아서 데이터 접근 허용</li>
              </ol>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Dismiss for 24 hours
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                localStorage.setItem("permission_dialog_dismissed_until", tomorrow.toISOString());
                setShowPermissionDialog(false);
              }}
            >
              하루동안 보지 않기
            </Button>
            <AlertDialogAction onClick={handleGrantPermission}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Health Connect Test UI */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700">Health Connect 테스트</CardTitle>
            <CardDescription>Kotlin 플러그인 연동 테스트</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleCheckPermissions} variant="outline">
                권한 확인
              </Button>
              <Button onClick={handleRequestPermissions} variant="default">
                모든 권한 요청
              </Button>
              <Button onClick={handleOpenSettings} variant="outline">
                Health Connect 설정 열기
              </Button>
              <Button onClick={handleReadSummary} variant="default">
                데이터 읽기
              </Button>
            </div>

            {permissionResult && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-sm">권한 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded">
                    {JSON.stringify(permissionResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {healthSummary && (
              <>
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm">데이터 요약</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">걸음수</p>
                      <p className="text-lg font-bold">{healthSummary.steps?.length || 0}건</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">심박수</p>
                      <p className="text-lg font-bold">{healthSummary.heartRate?.length || 0}건</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">운동</p>
                      <p className="text-lg font-bold">{healthSummary.exercises?.length || 0}건</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">수면</p>
                      <p className="text-lg font-bold">{healthSummary.sleepSessions?.length || 0}건</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">체중</p>
                      <p className="text-lg font-bold">{healthSummary.body?.weight?.length || 0}건</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">체지방</p>
                      <p className="text-lg font-bold">{healthSummary.body?.bodyFat?.length || 0}건</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground">영양</p>
                      <p className="text-lg font-bold">{healthSummary.nutrition?.length || 0}건</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm">전체 JSON (개발용)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded max-h-96">
                      {JSON.stringify(healthSummary, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>

        {!todayData ? (
          <Card className="bg-accent/10">
            <CardHeader>
              <CardTitle>Samsung Health 연동 필요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                오늘의 건강 데이터를 보려면 Samsung Health 연동이 필요합니다.
              </p>
              <p className="text-sm text-muted-foreground">
                이 기능은 Android 네이티브 앱에서만 사용 가능합니다. 
                앱을 다운로드하여 Samsung Health와 연동해주세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="mt-4">
              {renderHealthCard(todayData, "Today")}
            </TabsContent>
            
            <TabsContent value="week" className="mt-4">
              {renderHealthCard(weekData, "This Week")}
            </TabsContent>
            
            <TabsContent value="month" className="mt-4">
              {renderHealthCard(monthData, "This Month")}
            </TabsContent>
            
            <TabsContent value="year" className="mt-4">
              {renderHealthCard(yearData, "This Year")}
            </TabsContent>
          </Tabs>
        )}

      </div>
    </div>
  );
};

export default Index;
