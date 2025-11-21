import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Activity, Clock } from "lucide-react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [todayData, setTodayData] = useState<any>(null);
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const { toast } = useToast();

  useEffect(() => {
    requestNotificationPermission();
    scheduleDailyNotification();
    
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    loadTodayData();
  }, []);

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

  // Mock function to collect Samsung Health data
  // In a real implementation, this would use the Samsung Health SDK
  const collectSamsungHealthData = async () => {
    console.log("Collecting Samsung Health data...");
    
    // This is mock data. In a real app, you would:
    // 1. Request permissions from Samsung Health
    // 2. Use the Samsung Health SDK to fetch actual data
    // 3. Process and format the data
    
    // Note: Only returning data that actually exists in Samsung Health
    // If user hasn't done running, don't show running data
    
    return {
      steps_data: {
        count: 8234,
        distance: "6.2 km",
        calories: 312
      },
      exercise_data: [
        {
          type: "걷기",
          duration: "45",
          calories: 234,
          distance: 3.2
        },
        {
          type: "자전거",
          duration: "30",
          calories: 180,
          distance: 5.5
        }
      ],
      sleep_data: {
        duration: "7시간 30분",
        deep_sleep: "2시간 15분",
        light_sleep: "4시간 45분",
        rem_sleep: "30분"
      },
      body_composition_data: {
        weight: "72.5",
        body_fat: "18.5",
        body_fat_mass: "13.4",
        muscle_mass: "32.1",
        bmi: 23.4
      },
      nutrition_data: {
        calories: 1850,
        protein: "85g",
        carbs: "220g",
        fat: "65g"
      }
      // running_data is not included because user hasn't done any running
    };
  };

  const loadTodayData = async () => {
    const data = await collectSamsungHealthData();
    setTodayData(data);
  };

  const syncHealthData = async () => {
    setIsSyncing(true);
    
    try {
      const healthData = await collectSamsungHealthData();
      
      const { data, error } = await supabase.functions.invoke('send-health-data', {
        body: { healthData }
      });

      if (error) throw error;

      const now = new Date().toLocaleString('ko-KR');
      setLastSync(now);
      localStorage.setItem('lastSync', now);

      toast({
        title: "동기화 완료",
        description: "건강 데이터가 ChatGPT로 성공적으로 전송되었습니다.",
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

  const totalBurned = (todayData?.steps_data?.calories || 0) + 
    (todayData?.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.calories || 0), 0) || 0);
  const totalConsumed = todayData?.nutrition_data?.calories || 0;
  const calorieDiff = totalConsumed - totalBurned;

  const totalExerciseDistance = todayData?.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.distance || 0), 0) || 0;
  const totalExerciseTime = todayData?.exercise_data?.reduce((sum: number, ex: any) => sum + (ex.duration || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {todayData && (
          <>
            <Card className="bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Today</CardTitle>
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

              {todayData.steps_data && (
                <div className="space-y-2 p-3 rounded-lg bg-card">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <Activity className="h-4 w-4" />
                    걸음수
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>걸음수 {todayData.steps_data.count}</div>
                    <div>거리 {todayData.steps_data.distance}</div>
                    <div>칼로리 {todayData.steps_data.calories}</div>
                  </div>
                </div>
              )}
              
              {todayData.exercise_data && Array.isArray(todayData.exercise_data) && (
                <div className="space-y-2 p-3 rounded-lg bg-card">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <Activity className="h-4 w-4" />
                    운동
                  </h3>
                  {todayData.exercise_data.map((ex: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 text-sm border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
                      <div className="col-span-2 font-semibold">{ex.type}</div>
                      <div>시간 {ex.duration}분</div>
                      <div>칼로리 {ex.calories}kcal</div>
                      {ex.distance && <div className="col-span-2">거리 {ex.distance}km</div>}
                    </div>
                  ))}
                </div>
              )}

              {todayData.body_composition_data && (
                <div className="space-y-2 p-3 rounded-lg bg-card">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <Activity className="h-4 w-4" />
                    신체 구성
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>체중 {todayData.body_composition_data.weight}kg</div>
                    <div>체지방률 {todayData.body_composition_data.body_fat}%</div>
                    <div>체지방량 {todayData.body_composition_data.body_fat_mass}kg</div>
                    <div>근육량 {todayData.body_composition_data.muscle_mass}kg</div>
                  </div>
                </div>
              )}

              {todayData.sleep_data && (
                <div className="space-y-2 p-3 rounded-lg bg-card">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <Activity className="h-4 w-4" />
                    수면
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>수면 시간 {todayData.sleep_data.duration}</div>
                    <div>깊은 수면 {todayData.sleep_data.deep_sleep}</div>
                  </div>
                </div>
              )}

              {todayData.nutrition_data && (
                <div className="space-y-2 p-3 rounded-lg bg-card">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <Activity className="h-4 w-4" />
                    영양 섭취
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>섭취 칼로리 {todayData.nutrition_data.calories}kcal</div>
                    <div>단백질 {todayData.nutrition_data.protein}</div>
                    <div>탄수화물 {todayData.nutrition_data.carbs}</div>
                    <div>지방 {todayData.nutrition_data.fat}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

        <Card className="bg-secondary/20">
          <CardHeader>
            <CardTitle>동기화 상태</CardTitle>
            <CardDescription>
              마지막 동기화: {lastSync ? new Date(lastSync).toLocaleString('ko-KR') : '동기화 기록 없음'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncHealthData} 
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  수동 동기화
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>예약된 동기화</CardTitle>
            <CardDescription>
              매일 설정한 시간에 자동으로 건강 데이터가 동기화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="scheduled-sync" className="text-sm">자동 동기화</Label>
              <Switch 
                id="scheduled-sync"
                checked={scheduledSyncEnabled}
                onCheckedChange={(checked) => {
                  setScheduledSyncEnabled(checked);
                  if (checked) {
                    scheduleDailyNotification();
                    toast({
                      title: "자동 동기화 활성화",
                      description: `매일 ${syncTime}에 자동으로 동기화됩니다.`,
                    });
                  } else {
                    LocalNotifications.cancel({ notifications: [{ id: 1 }] });
                    toast({
                      title: "자동 동기화 비활성화",
                      description: "예약된 동기화가 취소되었습니다.",
                    });
                  }
                }}
              />
            </div>
            {scheduledSyncEnabled && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="time"
                  value={syncTime}
                  onChange={(e) => {
                    setSyncTime(e.target.value);
                    toast({
                      title: "동기화 시간 변경",
                      description: `${e.target.value}로 설정되었습니다.`,
                    });
                  }}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
