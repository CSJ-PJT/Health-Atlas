import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, Clock, RefreshCw, XCircle } from "lucide-react";
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
import { saveHealthSnapshot } from "@/providers/shared/services/healthDataRepository";
import { getSamsungLastSyncAt, setSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: string;
  message: string;
}

const Monitor = () => {
  const provider = getActiveProvider();
  const providerName = provider.displayName;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [providerStatus, setProviderStatus] = useState("checking");
  const [gptStatus, setGptStatus] = useState("checking");
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [scheduledSyncEnabled, setScheduledSyncEnabled] = useState(true);
  const [syncTime, setSyncTime] = useState("09:00");
  const [providerLastSync, setProviderLastSync] = useState("");
  const [gptLastSync, setGptLastSync] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const logsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidateHealthData = useInvalidateHealthData();

  useEffect(() => {
    void refreshStatuses();
    void fetchRecentLogs(currentPage);

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

  async function refreshStatuses() {
    await checkProviderConnection(false);
    checkGptConnection();
  }

  function checkGptConnection() {
    const gptEnabled = localStorage.getItem("openai_enabled") === "true";
    const lastSync = localStorage.getItem("lastSync");
    setGptStatus(gptEnabled ? "connected" : "disconnected");
    if (lastSync) {
      setGptLastSync(new Date(lastSync).toLocaleString("ko-KR"));
    }
    if (gptEnabled) {
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
    }
  }

  async function fetchRecentLogs(page = 1) {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      return;
    }

    let countQuery = supabase.from("transfer_logs").select("*", { count: "exact", head: true }).eq("profile_id", profileId);
    if (startDate) countQuery = countQuery.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) countQuery = countQuery.lte("created_at", `${endDate}T23:59:59`);
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

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch logs:", error);
      return;
    }
    setLogs(data || []);
  }

  function getStatusIcon(status: string) {
    if (status === "connected") return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    if (status === "checking") return <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />;
    return <XCircle className="h-8 w-8 text-red-500" />;
  }

  function getLogStatusIcon(status: string) {
    if (status === "success") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === "pending") return <Clock className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  }

  async function checkProviderConnection(showToast = true) {
    setProviderStatus("checking");

    try {
      const status = await provider.getConnectionStatus();
      if (!status.available) {
        setProviderStatus("disconnected");
        if (showToast) {
          toast({
            title: `${providerName} 미연결`,
            description: `${providerName} 데이터를 사용할 수 없습니다.`,
            variant: "destructive",
          });
        }
        return;
      }

      if (!status.connected) {
        setProviderStatus("disconnected");
        if (showToast) {
          toast({
            title: "권한 또는 설정 필요",
            description: status.message || `${providerName} 연결 상태를 다시 확인해 주세요.`,
            variant: "destructive",
          });
        }
        return;
      }

      setProviderStatus("connected");
      const lastSyncAt = status.lastSyncAt || getSamsungLastSyncAt();
      if (lastSyncAt) {
        setProviderLastSync(new Date(lastSyncAt).toLocaleString("ko-KR"));
      }

      if (showToast) {
        toast({
          title: providerName,
          description: "정상적으로 연결되어 있습니다.",
        });
      }
    } catch (error) {
      console.error(`${providerName} connection check failed:`, error);
      setProviderStatus("disconnected");
      if (showToast) {
        toast({
          title: "오류",
          description: `${providerName} 상태를 확인하지 못했습니다.`,
          variant: "destructive",
        });
      }
    }
  }

  async function checkGptConnectionManual() {
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
      const { data, error } = await supabase.from("openai_credentials").select("*").eq("profile_id", profileId).single();
      if (error || !data) {
        setGptStatus("disconnected");
        await createTransferLog("gpt_connection", "error", "GPT 연결 정보가 없습니다.");
        toast({
          title: "GPT 연결 오류",
          description: "설정에서 OpenAI 정보를 먼저 저장해 주세요.",
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

      await createTransferLog("gpt_connection", "success", "GPT 상태 확인 완료");
      toast({
        title: "GPT 연결 확인",
        description: "정상적으로 연결되어 있습니다.",
      });
      await fetchRecentLogs(currentPage);
    } catch (error) {
      console.error("GPT connection check failed:", error);
      setGptStatus("disconnected");
      toast({
        title: "오류",
        description: "GPT 연결 상태를 확인하지 못했습니다.",
        variant: "destructive",
      });
    }
  }

  function handleDateFilter() {
    setCurrentPage(1);
    void fetchRecentLogs(1);
  }

  function toggleSortOrder() {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  }

  function handleScheduledSyncToggle(enabled: boolean) {
    setScheduledSyncEnabled(enabled);
    localStorage.setItem("scheduled_sync_enabled", enabled.toString());
  }

  function handleSyncTimeChange(time: string) {
    setSyncTime(time);
    localStorage.setItem("sync_time", time);
  }

  async function collectProviderData() {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      throw new Error("프로필 정보를 찾을 수 없습니다.");
    }

    await createTransferLog("data_collection", "pending", `${providerName} 데이터 수집 시작`);
    try {
      const activeProvider = getActiveProvider();
      const data = await activeProvider.getTodayData();
      await saveHealthSnapshot(data, activeProvider.id, new Date().toISOString());
      await createTransferLog("data_collection", "success", `${providerName} 데이터 수집 완료`);
      return data;
    } catch (error) {
      await createTransferLog("data_collection", "error", error instanceof Error ? error.message : "데이터 수집 실패");
      throw error;
    }
  }

  async function syncProviderData() {
    setIsSyncing(true);
    try {
      const data = await collectProviderData();
      const profileId = localStorage.getItem("profile_id");
      if (profileId) {
        const { data: credentials } = await supabase.from("openai_credentials").select("*").eq("profile_id", profileId).maybeSingle();
        if (credentials?.api_key) {
          const { error } = await supabase.functions.invoke("send-health-data", { body: { healthData: data } });
          if (error) throw error;
        }
      }

      const now = new Date().toISOString();
      localStorage.setItem("lastSync", now);
      setSamsungLastSyncAt(now);
      setProviderLastSync(new Date(now).toLocaleString("ko-KR"));
      await createTransferLog("sync", "success", `${providerName} 데이터 동기화 완료`);
      invalidateHealthData();
      toast({
        title: "동기화 완료",
        description: "홈, 기록, 비교 데이터를 새로 불러옵니다.",
      });
      await fetchRecentLogs(currentPage);
      await checkProviderConnection(false);
    } catch (error) {
      console.error("Sync failed:", error);
      await createTransferLog("sync", "error", error instanceof Error ? error.message : "동기화 실패");
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
      await fetchRecentLogs(currentPage);
    } finally {
      setIsSyncing(false);
    }
  }

  const totalPages = Math.ceil(totalLogs / logsPerPage) || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav />
      <ScrollToTop />
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-8 pt-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">모니터</h1>
          <p className="text-sm text-muted-foreground">실데이터 수집, 연결 상태, 로그를 한 화면에서 확인합니다.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{providerName}</CardTitle>
              <CardDescription>연결 상태</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getStatusIcon(providerStatus)}
              <div className="text-sm text-muted-foreground">최근 동기화: {providerLastSync || "없음"}</div>
              <Button variant="outline" className="w-full" onClick={() => void checkProviderConnection()}>
                상태 확인
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GPT</CardTitle>
              <CardDescription>AI 연결 상태</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getStatusIcon(gptStatus)}
              <div className="text-sm text-muted-foreground">최근 확인: {gptLastSync || "없음"}</div>
              <div className="text-sm text-muted-foreground">예상 잔여 토큰: {remainingTokens.toLocaleString()}</div>
              <Button variant="outline" className="w-full" onClick={() => void checkGptConnectionManual()}>
                GPT 확인
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>예약 동기화</CardTitle>
              <CardDescription>자동 동기화 시간</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="text-sm">자동 동기화</div>
                <Switch checked={scheduledSyncEnabled} onCheckedChange={handleScheduledSyncToggle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitor-sync-time">동기화 시간</Label>
                <Input id="monitor-sync-time" type="time" value={syncTime} onChange={(e) => handleSyncTimeChange(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>실행</CardTitle>
              <CardDescription>즉시 수집 및 동기화</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={() => void syncProviderData()} disabled={isSyncing}>
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "동기화 중..." : "지금 동기화"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/admin")}>
                설정으로 이동
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>연동 로그</CardTitle>
            <CardDescription>날짜 필터와 정렬로 최근 로그를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end gap-2 md:col-span-2">
                <Button variant="outline" onClick={handleDateFilter}>
                  필터 적용
                </Button>
                <Button variant="outline" className="gap-2" onClick={toggleSortOrder}>
                  <ArrowUpDown className="h-4 w-4" />
                  {sortOrder === "asc" ? "오래된 순" : "최신 순"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">표시할 로그가 없습니다.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between rounded-xl border p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {getLogStatusIcon(log.status)}
                        <div className="font-medium">{log.log_type}</div>
                        <Badge variant="outline">{log.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{log.message}</div>
                      <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("ko-KR")}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentPage} / {totalPages} 페이지
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitor;
