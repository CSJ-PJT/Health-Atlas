import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, RefreshCw, ArrowUpDown, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollToTop } from "@/components/ScrollToTop";

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
  const logsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkConnections();
    fetchRecentLogs(currentPage);
    
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

  const checkConnections = () => {
    // Check Samsung Health connection
    const samsungConnected = localStorage.getItem("samsung_health_connected") === "true";
    const samsungLastSyncTime = localStorage.getItem("samsung_health_last_sync");
    
    if (samsungConnected && samsungLastSyncTime) {
      setSamsungHealthStatus("connected");
      setSamsungHealthLastSync(new Date(samsungLastSyncTime).toLocaleString('ko-KR'));
    } else {
      setSamsungHealthStatus("disconnected");
      setSamsungHealthLastSync("");
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
      // Check if Samsung Health is actually connected
      const samsungConnected = localStorage.getItem("samsung_health_connected") === "true";
      const samsungLastSyncTime = localStorage.getItem("samsung_health_last_sync");
      
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!samsungConnected || !samsungLastSyncTime) {
        setSamsungHealthStatus("disconnected");
        toast({
          title: "Samsung Health 연동 오류",
          description: "Samsung Health가 연동되지 않았습니다. 홈에서 연동을 완료해주세요.",
          variant: "destructive",
        });
        
        // Log error
        const profileId = localStorage.getItem("profile_id");
        if (profileId) {
          await supabase.from("transfer_logs").insert({
            profile_id: profileId,
            log_type: "삼성헬스 연동",
            status: "error",
            message: "Samsung Health 연동 오류: 연동되지 않음"
          });
        }
        fetchRecentLogs(currentPage);
        return;
      }
      
      setSamsungHealthStatus("connected");
      setSamsungHealthLastSync(new Date(samsungLastSyncTime).toLocaleString('ko-KR'));
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
          message: "Samsung Health 상태 확인 완료"
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
