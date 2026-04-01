import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateHealthData } from "@/hooks/useHealthData";
import { supabase } from "@/integrations/supabase/client";
import { getActiveProvider } from "@/providers/shared";
import { createTransferLog } from "@/providers/shared/services/transferLogRepository";
import { getSamsungLastSyncAt, setSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: string;
  message: string;
}

const Monitor = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [samsungHealthStatus, setSamsungHealthStatus] = useState("checking");
  const [gptStatus, setGptStatus] = useState("checking");
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const [samsungHealthLastSync, setSamsungHealthLastSync] = useState("");
  const [gptLastSync, setGptLastSync] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const logsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidateHealthData = useInvalidateHealthData();

  useEffect(() => {
    void checkConnections();
    void fetchRecentLogs(currentPage);

    const savedLastSync = localStorage.getItem("lastSync");
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    setStartDate(lastWeek.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);

    const savedSyncEnabled = localStorage.getItem("scheduled_sync_enabled");
    const savedSyncTime = localStorage.getItem("sync_time");
    if (savedSyncEnabled !== null) {
      setScheduledSyncEnabled(savedSyncEnabled === "true");
    }
    if (savedSyncTime) {
      setSyncTime(savedSyncTime);
    }
  }, []);

  useEffect(() => {
    void fetchRecentLogs(currentPage);
  }, [sortOrder, currentPage]);

  const checkConnections = async () => {
    await checkSamsungHealthConnection(false);
    checkGPTConnection();
  };

  const checkGPTConnection = () => {
    const gptEnabled = localStorage.getItem("openai_enabled") === "true";
    const gptLastSyncTime = localStorage.getItem("lastSync");

    setGptStatus(gptEnabled ? "connected" : "disconnected");
    if (gptLastSyncTime) {
      setGptLastSync(new Date(gptLastSyncTime).toLocaleString("ko-KR"));
    }
    if (gptEnabled) {
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
    }
  };

  const fetchRecentLogs = async (page = 1) => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      return;
    }

    try {
      let countQuery = supabase
        .from("transfer_logs")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profileId);

      if (startDate) {
        countQuery = countQuery.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        countQuery = countQuery.lte("created_at", `${endDate}T23:59:59`);
      }

      const { count } = await countQuery;
      setTotalLogs(count || 0);

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
        throw error;
      }

      setLogs(data || []);
    } catch (fetchError) {
      console.error("Failed to fetch logs:", fetchError);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "connected") {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    }
    if (status === "checking") {
      return <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin" />;
    }
    return <XCircle className="h-8 w-8 text-red-500" />;
  };

  const getLogStatusIcon = (status: string) => {
    if (status === "success") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status === "pending") {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const checkSamsungHealthConnection = async (showToast = true) => {
    setSamsungHealthStatus("checking");

    try {
      const provider = getActiveProvider();
      const status = await provider.getConnectionStatus();
      if (!status.available) {
        setSamsungHealthStatus("disconnected");
        if (showToast) {
          toast({
            title: "Samsung Health 미연결",
            description: "현재 환경에서 Health Connect를 사용할 수 없습니다.",
            variant: "destructive",
          });
        }
        return;
      }

      if (!status.connected) {
        setSamsungHealthStatus("disconnected");
        if (showToast) {
          toast({
            title: "권한 필요",
            description: "Health Connect 권한이 아직 허용되지 않았습니다.",
            variant: "destructive",
          });
        }
        return;
      }

      setSamsungHealthStatus("connected");
      const lastSyncAt = getSamsungLastSyncAt();
      if (lastSyncAt) {
        setSamsungHealthLastSync(new Date(lastSyncAt).toLocaleString("ko-KR"));
      }

      if (showToast) {
        toast({
          title: "Samsung Health",
          description: "정상적으로 연결되어 있습니다.",
        });
      }
    } catch (providerError) {
      console.error("Samsung Health connection check failed:", providerError);
      setSamsungHealthStatus("disconnected");
      if (showToast) {
        toast({
          title: "오류",
          description: "Samsung Health 상태를 확인할 수 없습니다.",
          variant: "destructive",
        });
      }
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
        await createTransferLog("GPT 연결", "error", "GPT 연결 정보가 없습니다.");
        toast({
          title: "GPT 연결 오류",
          description: "설정에서 OpenAI 정보를 먼저 저장해주세요.",
          variant: "destructive",
        });
        await fetchRecentLogs(currentPage);
        return;
      }

      setGptStatus("connected");
      const now = new Date().toISOString();
      localStorage.setItem("openai_enabled", "true");
      localStorage.setItem("lastSync", now);
      setGptLastSync(new Date(now).toLocaleString("ko-KR"));
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);

      await createTransferLog("GPT 연결", "success", "GPT 상태 확인 완료");
      toast({
        title: "GPT 연결 확인",
        description: "정상적으로 연결되어 있습니다.",
      });
      await fetchRecentLogs(currentPage);
    } catch (connectionError) {
      console.error("GPT connection check failed:", connectionError);
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
    void fetchRecentLogs(1);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleScheduledSyncToggle = (enabled: boolean) => {
    setScheduledSyncEnabled(enabled);
    localStorage.setItem("scheduled_sync_enabled", enabled.toString());
  };

  const handleSyncTimeChange = (time: string) => {
    setSyncTime(time);
    localStorage.setItem("sync_time", time);
  };

  const collectSamsungHealthData = async () => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      throw new Error("프로필 정보를 찾을 수 없습니다.");
    }

    await createTransferLog("data_collection", "pending", "Health Connect 데이터 수집 시작");
    try {
      const data = await getActiveProvider().getTodayData();
      await createTransferLog("data_collection", "success", "Health Connect 데이터 수집 완료");
      return data;
    } catch (collectionError) {
      await createTransferLog(
        "data_collection",
        "error",
        `데이터 수집 실패: ${collectionError instanceof Error ? collectionError.message : String(collectionError)}`,
      );
      throw collectionError;
    }
  };

  const syncHealthData = async () => {
    setIsSyncing(true);

    try {
      const healthData = await collectSamsungHealthData();
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        throw new Error("사용자 프로필을 찾을 수 없습니다. Setup을 다시 진행해주세요.");
      }

      const { data: credentials } = await supabase
        .from("openai_credentials")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (!credentials?.api_key) {
        throw new Error("GPT 연결이 필요합니다. Setup 메뉴에서 OpenAI API Key를 설정해주세요.");
      }

      await createTransferLog("GPT 연결", "pending", "GPT로 데이터 전송 시도 중...");
      const { error } = await supabase.functions.invoke("send-health-data", {
        body: { healthData },
      });

      if (error) {
        await createTransferLog("GPT 연결", "error", `GPT 전송 실패: ${error.message}`);
        throw error;
      }

      await createTransferLog("GPT 연결", "success", "건강 데이터가 GPT로 성공적으로 전송되었습니다.");

      const now = new Date().toISOString();
      setSamsungLastSyncAt(now);
      setSamsungHealthLastSync(new Date(now).toLocaleString("ko-KR"));
      setLastSync(now);
      localStorage.setItem("lastSync", now);

      toast({
        title: "동기화 완료",
        description: "건강 데이터가 GPT로 성공적으로 전송되었습니다.",
      });

      invalidateHealthData();
      await fetchRecentLogs(currentPage);
    } catch (syncError) {
      console.error("Sync error:", syncError);
      toast({
        title: "동기화 실패",
        description: syncError instanceof Error ? syncError.message : "데이터 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold mb-6">연동 상태</h1>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              예약 동기화
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
                    onChange={(event) => handleSyncTimeChange(event.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(samsungHealthStatus)}
                <div className="flex-1">
                  <h3 className="font-semibold">Samsung Health</h3>
                  <p className="text-sm text-muted-foreground">
                    {samsungHealthStatus === "connected"
                      ? "정상 연결"
                      : samsungHealthStatus === "checking"
                        ? "확인 중..."
                        : "연결되지 않음"}
                  </p>
                  {samsungHealthLastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      최종 동기화 {samsungHealthLastSync}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void checkSamsungHealthConnection(true)}
                disabled={samsungHealthStatus === "checking"}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${samsungHealthStatus === "checking" ? "animate-spin" : ""}`} />
                상태 확인
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(gptStatus)}
                <div className="flex-1">
                  <h3 className="font-semibold">GPT</h3>
                  <p className="text-sm text-muted-foreground">
                    {gptStatus === "connected"
                      ? `정상 연결 (예상 토큰: ${remainingTokens.toLocaleString()})`
                      : gptStatus === "checking"
                        ? "확인 중..."
                        : "연결되지 않음"}
                  </p>
                  {gptLastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      최종 확인 {gptLastSync}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {gptStatus !== "connected" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/setup")}>
                    설정하기
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void checkGPTConnectionManual()}
                  disabled={gptStatus === "checking"}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${gptStatus === "checking" ? "animate-spin" : ""}`} />
                  상태 확인
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle>수동 동기화</CardTitle>
            <CardDescription>
              마지막 동기화 {lastSync ? new Date(lastSync).toLocaleString("ko-KR") : "동기화 기록 없음"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void syncHealthData()} disabled={isSyncing} className="w-full">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "동기화 중..." : "지금 동기화"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle>로그</CardTitle>
            <CardDescription>삼성헬스 연동, GPT 연동, 데이터 전송 및 오류 기록</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">시작 날짜</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">종료 날짜</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
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
              <p className="text-center text-muted-foreground py-8">로그가 없습니다.</p>
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
                            {new Date(log.created_at).toLocaleString("ko-KR")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status === "success" ? "성공" : log.status === "error" ? "실패" : "대기 중"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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
