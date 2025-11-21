import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";

const Index = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Request notification permissions
    requestNotificationPermission();
    
    // Schedule daily notification at 9 AM
    scheduleDailyNotification();
    
    // Load last sync time
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    // Load today's data
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
      // Cancel existing notifications
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      
      // Schedule notification for 9 AM daily
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(9, 0, 0, 0);
      
      // If 9 AM has passed today, schedule for tomorrow
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

  const [todayData, setTodayData] = useState<any>(null);

  const collectSamsungHealthData = async () => {
    // Mock data - 실제 앱에서는 Samsung Health SDK를 사용해야 합니다
    // This is placeholder data structure
    return {
      steps: [
        { count: 8500, calories: 340 },
      ],
      exercise: [
        { type: '걷기', duration: 30, calories: 150 },
        { type: '자전거', duration: 45, calories: 300 },
      ],
      running: [
        { distance: 5.2, duration: 35, calories: 400 },
      ],
      sleep: [
        { duration: 7.5, deepSleep: 2.5 },
      ],
      bodyComposition: [
        { weight: 70, bodyFat: 18, muscleMass: 32 },
      ],
      nutrition: [
        { name: '아침식사', calories: 450, carbs: 60, protein: 20, fat: 15 },
        { name: '점심식사', calories: 680, carbs: 85, protein: 35, fat: 22 },
        { name: '저녁식사', calories: 550, carbs: 70, protein: 28, fat: 18 },
      ],
    };
  };

  const loadTodayData = async () => {
    const data = await collectSamsungHealthData();
    setTodayData(data);
  };

  const syncHealthData = async () => {
    setIsSyncing(true);
    
    try {
      // Collect Samsung Health data
      const healthData = await collectSamsungHealthData();
      
      // Send to backend
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              삼성헬스 동기화
            </h1>
            <p className="text-muted-foreground">
              매일 오전 9시 자동으로 ChatGPT에 데이터를 전송합니다
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <NavLink to="/history">동기화 기록</NavLink>
            <NavLink to="/comparison">데이터 비교</NavLink>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>동기화 상태</CardTitle>
            <CardDescription>
              {lastSync 
                ? `마지막 동기화: ${lastSync}`
                : '아직 동기화되지 않았습니다'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncHealthData} 
              disabled={isSyncing}
              className="w-full"
              size="lg"
            >
              {isSyncing ? '동기화 중...' : '지금 동기화하기'}
            </Button>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>📊 수집되는 데이터:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>운동 기록</li>
                <li>러닝 기록</li>
                <li>수면 기록</li>
                <li>체성분 기록</li>
                <li>음식 및 영양 기록</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자동 동기화</CardTitle>
            <CardDescription>
              매일 오전 9시에 전날 00시~24시 데이터를 자동으로 전송합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">알림 권한</span>
              <span className="text-sm text-muted-foreground">설정됨 ✓</span>
            </div>
          </CardContent>
        </Card>

        {todayData && (
          <Card>
            <CardHeader>
              <CardTitle>오늘의 건강 데이터</CardTitle>
              <CardDescription>
                삼성헬스에서 수집된 오늘의 데이터
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayData.steps && todayData.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">🚶 걸음수</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>걸음수: {todayData.steps[0].count}걸음</div>
                    <div>칼로리: {todayData.steps[0].calories}kcal</div>
                  </div>
                </div>
              )}

              {todayData.exercise && todayData.exercise.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">💪 운동</h4>
                  {todayData.exercise.map((ex: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                      <div>종류: {ex.type}</div>
                      <div>시간: {ex.duration}분</div>
                      <div>칼로리: {ex.calories}kcal</div>
                    </div>
                  ))}
                </div>
              )}

              {todayData.running && todayData.running.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">🏃 러닝</h4>
                  {todayData.running.map((run: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                      <div>거리: {run.distance}km</div>
                      <div>시간: {run.duration}분</div>
                      <div>칼로리: {run.calories}kcal</div>
                    </div>
                  ))}
                </div>
              )}

              {todayData.bodyComposition && todayData.bodyComposition.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">⚖️ 체성분</h4>
                  {todayData.bodyComposition.map((bc: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                      <div>체중: {bc.weight}kg</div>
                      <div>체지방: {bc.bodyFat}%</div>
                      <div>근육량: {bc.muscleMass}kg</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
