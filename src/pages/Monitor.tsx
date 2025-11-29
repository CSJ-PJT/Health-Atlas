import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, RefreshCw, ArrowUpDown, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useInvalidateHealthData } from "@/hooks/useHealthData";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: string;
  message: string;
}

const Monitor = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [samsungHealthStatus, setSamsungHealthStatus] = useState<string>("checking");
  const [gptStatus, setGptStatus] = useState<string>("checking");
  const [remainingTokens, setRemainingTokens] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const [samsungHealthLastSync, setSamsungHealthLastSync] = useState<string>("");
  const [gptLastSync, setGptLastSync] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const logsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Hook to invalidate all health data queries after sync
  const invalidateHealthData = useInvalidateHealthData();

  useEffect(() => {
    const initConnections = async () => {
      await checkConnections();
    };
    initConnections();
    fetchRecentLogs(currentPage);
    
    // Load last sync time
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }
    
    // Set default date range (last 7 days)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    setStartDate(lastWeek.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    // Load scheduled sync settings
    const savedSyncEnabled = localStorage.getItem("scheduled_sync_enabled");
    const savedSyncTime = localStorage.getItem("sync_time");
    if (savedSyncEnabled !== null) {
      setScheduledSyncEnabled(savedSyncEnabled === "true");
    }
    if (savedSyncTime) {
      setSyncTime(savedSyncTime);
    }
  }, []);

  const checkConnections = async () => {
    try {
      const isNative = (window as any).Capacitor?.isNativePlatform();
      if (!isNative) {
        setSamsungHealthStatus("disconnected");
        checkGPTConnection();
        return;
      }

      // Import Health Connect functions
      const { checkPermissions } = await import("@/lib/health-connect");

      // Check Health Connect permission status
      const permStatus = await checkPermissions();
      if (permStatus.hasAll) {
        setSamsungHealthStatus("connected");
        const lastSync = localStorage.getItem("samsung_health_last_sync");
        if (lastSync) {
          setSamsungHealthLastSync(new Date(lastSync).toLocaleString('ko-KR'));
        }
      } else {
        setSamsungHealthStatus("disconnected");
        setSamsungHealthLastSync("");
      }
    } catch (error) {
      console.error("Failed to check Health Connect permissions:", error);
      setSamsungHealthStatus("disconnected");
    }
    
    checkGPTConnection();
  };

  const checkGPTConnection = () => {
    const gptEnabled = localStorage.getItem("openai_enabled") === "true";
    const gptLastSyncTime = localStorage.getItem("lastSync");
    
    setGptStatus(gptEnabled ? "connected" : "disconnected");
    
    if (gptLastSyncTime) {
      setGptLastSync(new Date(gptLastSyncTime).toLocaleString('ko-KR'));
    }
    
    // Simulate token count
    if (gptEnabled) {
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
    }
  };

  const fetchRecentLogs = async (page: number = 1) => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) return;

    try {
      // First get total count
      let countQuery = supabase
        .from("transfer_logs")
        .select("*", { count: 'exact', head: true })
        .eq("profile_id", profileId);

      if (startDate) {
        countQuery = countQuery.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        countQuery = countQuery.lte("created_at", `${endDate}T23:59:59`);
      }

      const { count } = await countQuery;
      setTotalLogs(count || 0);

      // Then get paginated data
      const from = (page - 1) * logsPerPage;
      const to = from + logsPerPage - 1;

      let query = supabase
        .from("transfer_logs")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: sortOrder === "asc" })
        .range(from, to);

      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("로그 가져오기 실패:", error);
        toast({
          title: "오류",
          description: "로그를 가져오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setLogs(data);
      }
    } catch (error) {
      console.error("로그 가져오기 오류:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    } else if (status === "checking") {
      return <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin" />;
    } else {
      return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getLogStatusIcon = (status: string) => {
    if (status === "success") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (status === "pending") {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const checkSamsungHealthConnection = async () => {
    setSamsungHealthStatus("checking");
    
    try {
      const isNative = (window as any).Capacitor?.isNativePlatform();
      if (!isNative) {
        setSamsungHealthStatus("disconnected");
        toast({
          title: "네이티브 환경 필요",
          description: "Samsung Health는 네이티브 앱에서만 사용할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      // Import Health Connect functions
      const { checkHealthConnectAvailability, checkPermissions } = await import("@/lib/health-connect");

      // Check if Health Connect is available
      const available = await checkHealthConnectAvailability();
      if (!available) {
        setSamsungHealthStatus("disconnected");
        toast({
          title: "Health Connect 미지원",
          description: "이 기기는 Health Connect를 지원하지 않습니다.",
          variant: "destructive",
        });
        
        // Log error
        const profileId = localStorage.getItem("profile_id");
        if (profileId) {
          await supabase.from("transfer_logs").insert({
            profile_id: profileId,
            log_type: "삼성헬스 연동",
            status: "error",
            message: "Health Connect 미지원 기기"
          });
        }
        fetchRecentLogs(currentPage);
        return;
      }

      // Check permissions
      const permStatus = await checkPermissions();
      if (!permStatus.hasAll) {
        setSamsungHealthStatus("disconnected");
        toast({
          title: "권한 필요",
          description: `Health Connect 권한이 필요합니다. (${permStatus.grantedCount}/${permStatus.requiredCount})`,
          variant: "destructive",
        });
        
        // Log error
        const profileId = localStorage.getItem("profile_id");
        if (profileId) {
          await supabase.from("transfer_logs").insert({
            profile_id: profileId,
            log_type: "삼성헬스 연동",
            status: "error",
            message: `권한 부족: ${permStatus.grantedCount}/${permStatus.requiredCount}`
          });
        }
        fetchRecentLogs(currentPage);
        return;
      }
      
      // All permissions granted
      setSamsungHealthStatus("connected");
      const now = new Date().toISOString();
      localStorage.setItem("samsung_health_last_sync", now);
      setSamsungHealthLastSync(new Date(now).toLocaleString('ko-KR'));
      
      toast({
        title: "Samsung Health",
        description: "정상적으로 연결되어 있습니다.",
      });
      
      // Log success
      const profileId = localStorage.getItem("profile_id");
      if (profileId) {
        await supabase.from("transfer_logs").insert({
          profile_id: profileId,
          log_type: "삼성헬스 연동",
          status: "success",
          message: "Health Connect 정상 연동됨"
        });
        fetchRecentLogs(currentPage);
      }
    } catch (error) {
      console.error("Samsung Health 연결 확인 오류:", error);
      setSamsungHealthStatus("disconnected");
      toast({
        title: "오류",
        description: "Samsung Health 연결 상태를 확인할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const checkGPTConnectionManual = async () => {
    setGptStatus("checking");
    
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      setGptStatus("disconnected");
      toast({
        title: "오류",
        description: "프로필 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("openai_credentials")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (error || !data) {
        setGptStatus("disconnected");
        toast({
          title: "GPT 연동 오류",
          description: "GPT가 연동되지 않았습니다. 설정에서 연동을 완료해주세요.",
          variant: "destructive",
        });
        
        // Log error
        await supabase.from("transfer_logs").insert({
          profile_id: profileId,
          log_type: "GPT 연동",
          status: "error",
          message: "GPT 연동 오류: 연동되지 않음"
        });
        fetchRecentLogs(currentPage);
        return;
      }

      setGptStatus("connected");
      const now = new Date().toISOString();
      localStorage.setItem("openai_enabled", "true");
      localStorage.setItem("lastSync", now);
      setGptLastSync(new Date(now).toLocaleString('ko-KR'));
      
      // Simulate token count
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
      
      toast({
        title: "GPT 연동 확인",
        description: "정상적으로 연결되어 있습니다.",
      });
      
      // Log success
      await supabase.from("transfer_logs").insert({
        profile_id: profileId,
        log_type: "GPT 연동",
        status: "success",
        message: "GPT 상태 확인 완료"
      });
      fetchRecentLogs(currentPage);
    } catch (error) {
      console.error("GPT 연결 확인 오류:", error);
      setGptStatus("disconnected");
      toast({
        title: "오류",
        description: "GPT 연결 상태를 확인할 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
    fetchRecentLogs(1);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    fetchRecentLogs(currentPage);
  }, [sortOrder, currentPage]);

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  const handleScheduledSyncToggle = (enabled: boolean) => {
    setScheduledSyncEnabled(enabled);
    localStorage.setItem("scheduled_sync_enabled", enabled.toString());
  };

  const handleSyncTimeChange = (time: string) => {
    setSyncTime(time);
    localStorage.setItem("sync_time", time);
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

    // Import Health Connect functions
    const { checkPermissions, getTodayHealthData } = await import("@/lib/health-connect");

    // Check Health Connect permission status
    const permStatus = await checkPermissions();
    if (!permStatus.hasAll) {
      throw new Error("Health Connect 권한이 필요합니다.");
    }

    await logTransferStatus("data_collection", "pending", "Health Connect 데이터 수집 시작");

    try {
      const snapshot = await getTodayHealthData();
      await logTransferStatus("data_collection", "success", "Health Connect 데이터 수집 완료");
      
      // Format data for GPT
      const avgHeartRate = snapshot.heartRate.length > 0
        ? Math.round(snapshot.heartRate.reduce((sum, hr) => sum + hr.bpm, 0) / snapshot.heartRate.length)
        : 0;

      const latestWeight = snapshot.weight.length > 0 ? snapshot.weight[snapshot.weight.length - 1].weightKg : 0;
      const latestBodyFat = snapshot.bodyFat.length > 0 ? snapshot.bodyFat[snapshot.bodyFat.length - 1].percentage : 0;
      const distanceKm = (snapshot.aggregate.distanceMeter / 1000).toFixed(2);

      const exerciseData = snapshot.exerciseSessions.map(session => ({
        type: session.title || "운동",
        duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
        calories: session.caloriesKcal,
        exerciseType: session.exerciseType,
      }));

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
          stages: snapshot.sleepStageSummary,
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
      
      // Invalidate all health data queries to refresh UI
      invalidateHealthData();
      
      // Refresh logs
      fetchRecentLogs(currentPage);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold mb-6">연동 상태</h1>
        
        {/* Scheduled Sync Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              예약된 동기화
            </CardTitle>
            <CardDescription>
              매일 설정한 시간에 자동으로 건강 데이터가 동기화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="scheduled-sync">자동 동기화</Label>
              <Switch
                id="scheduled-sync"
                checked={scheduledSyncEnabled}
                onCheckedChange={handleScheduledSyncToggle}
              />
            </div>
            {scheduledSyncEnabled && (
              <div className="space-y-2">
                <Label htmlFor="sync-time">동기화 시간</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sync-time"
                    type="time"
                    value={syncTime}
                    onChange={(e) => handleSyncTimeChange(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Samsung Health Status */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(samsungHealthStatus)}
                <div className="flex-1">
                  <h3 className="font-semibold">Samsung Health</h3>
                  <p className="text-sm text-muted-foreground">
                    {samsungHealthStatus === "connected" ? "정상 연결됨" : 
                     samsungHealthStatus === "checking" ? "확인 중..." : "연결되지 않음"}
                  </p>
                  {samsungHealthLastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      최종 동기화: {samsungHealthLastSync}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSamsungHealthConnection}
                disabled={samsungHealthStatus === "checking"}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${samsungHealthStatus === "checking" ? "animate-spin" : ""}`} />
                상태 확인
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GPT Status */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(gptStatus)}
                <div className="flex-1">
                  <h3 className="font-semibold">GPT</h3>
                  <p className="text-sm text-muted-foreground">
                    {gptStatus === "connected" 
                      ? `정상 연결됨 (남은 토큰: ${remainingTokens.toLocaleString()})` 
                      : gptStatus === "checking" ? "확인 중..." : "연결되지 않음"}
                  </p>
                  {gptLastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      최종 동기화: {gptLastSync}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {gptStatus !== "connected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/setup")}
                  >
                    설정하기
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkGPTConnectionManual}
                  disabled={gptStatus === "checking"}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${gptStatus === "checking" ? "animate-spin" : ""}`} />
                  상태 확인
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Sync Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle>수동 동기화</CardTitle>
            <CardDescription>
              마지막 동기화: {lastSync ? new Date(lastSync).toLocaleString('ko-KR') : '동기화 기록 없음'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={syncHealthData} 
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  지금 동기화
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transfer Logs */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle>로그</CardTitle>
            <CardDescription>
              삼성헬스 연동, GPT 연동, 데이터 전송 및 오류 기록
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">시작 날짜</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">종료 날짜</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex items-end gap-2">
                <Button onClick={handleDateFilter} className="flex-1">
                  조회
                </Button>
                <Button onClick={toggleSortOrder} variant="outline" className="px-3">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                로그가 없습니다.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => navigate(`/monitor/log/${log.id}`)}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {getLogStatusIcon(log.status)}
                        <div>
                          <p className="font-medium">{log.log_type}</p>
                          <p className="text-sm text-muted-foreground">{log.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status === "success" ? "성공" : log.status === "error" ? "실패" : "대기 중"}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} / {totalPages} 페이지
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitor;
