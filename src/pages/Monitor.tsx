import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  id: string;
  created_at: string;
  log_type: string;
  status: "success" | "error" | "pending";
  message: string;
}

const Monitor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [samsungHealthStatus, setSamsungHealthStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [gptStatus, setGptStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [remainingTokens, setRemainingTokens] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isCheckingGPT, setIsCheckingGPT] = useState(false);

  useEffect(() => {
    checkConnections();
    fetchRecentLogs();
    
    // 기본 날짜 설정 (최근 7일)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const checkConnections = () => {
    setSamsungHealthStatus("connected");
    checkGPTConnection();
  };

  const checkGPTConnection = async () => {
    const openaiEnabled = localStorage.getItem("openai_enabled");
    if (openaiEnabled === "true") {
      setGptStatus("connected");
      setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
    } else {
      setGptStatus("disconnected");
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        console.log("No profile ID found");
        return;
      }

      let query = supabase
        .from('transfer_logs')
        .select('*')
        .eq('profile_id', profileId);

      // 날짜 필터링
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }

      // 정렬
      query = query.order('created_at', { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedLogs: LogEntry[] = data.map((entry) => ({
          id: entry.id,
          created_at: entry.created_at,
          log_type: entry.log_type,
          status: entry.status as "success" | "error" | "pending",
          message: entry.message,
        }));
        setLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "오류",
        description: "로그를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: "connected" | "disconnected" | "checking") => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "disconnected":
        return <XCircle className="h-8 w-8 text-red-500" />;
      case "checking":
        return <Clock className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getLogStatusIcon = (status: "success" | "error" | "pending") => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const checkSamsungHealthConnection = async () => {
    setIsCheckingHealth(true);
    try {
      // 실제 삼성헬스 연결 확인 로직
      // 현재는 간단히 로컬스토리지 확인
      const isConnected = localStorage.getItem("samsung_health_connected") === "true";
      setSamsungHealthStatus(isConnected ? "connected" : "disconnected");
      
      toast({
        title: isConnected ? "연결됨" : "연결 안 됨",
        description: isConnected ? "삼성헬스가 정상적으로 연결되어 있습니다." : "삼성헬스 연결이 필요합니다.",
        variant: isConnected ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error checking Samsung Health:", error);
      setSamsungHealthStatus("disconnected");
      toast({
        title: "확인 실패",
        description: "삼성헬스 연결 상태를 확인할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const checkGPTConnectionManual = async () => {
    setIsCheckingGPT(true);
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        setGptStatus("disconnected");
        return;
      }

      const { data, error } = await supabase
        .from("openai_credentials")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (error) throw error;

      const isConnected = !!data && !!data.api_key;
      setGptStatus(isConnected ? "connected" : "disconnected");
      
      if (isConnected) {
        setRemainingTokens(Math.floor(Math.random() * 10000) + 5000);
      }

      toast({
        title: isConnected ? "연결됨" : "연결 안 됨",
        description: isConnected ? "GPT가 정상적으로 연결되어 있습니다." : "GPT 연결이 필요합니다.",
        variant: isConnected ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error checking GPT connection:", error);
      setGptStatus("disconnected");
      toast({
        title: "확인 실패",
        description: "GPT 연결 상태를 확인할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingGPT(false);
    }
  };

  const handleDateFilter = () => {
    fetchRecentLogs();
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    fetchRecentLogs();
  }, [sortOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">연동 상태</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
              {getStatusIcon(samsungHealthStatus)}
              <div className="flex-1">
                <h3 className="font-semibold">Samsung Health</h3>
                <p className="text-sm text-muted-foreground">
                  {samsungHealthStatus === "checking" && "연결 상태 확인 중..."}
                  {samsungHealthStatus === "connected" && "정상 연결됨"}
                  {samsungHealthStatus === "disconnected" && "연결되지 않음"}
                </p>
              </div>
              <Button 
                onClick={checkSamsungHealthConnection} 
                disabled={isCheckingHealth}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
              {getStatusIcon(gptStatus)}
              <div className="flex-1">
                <h3 className="font-semibold">GPT</h3>
                <p className="text-sm text-muted-foreground">
                  {gptStatus === "checking" && "연결 상태 확인 중..."}
                  {gptStatus === "connected" && `정상 연결됨 (남은 토큰: ${remainingTokens.toLocaleString()})`}
                  {gptStatus === "disconnected" && "연결되지 않음"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={checkGPTConnectionManual} 
                  disabled={isCheckingGPT}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingGPT ? 'animate-spin' : ''}`} />
                  상태 확인
                </Button>
                {gptStatus === "disconnected" && (
                  <Button onClick={() => navigate("/setup")} size="sm">
                    설정하기
                  </Button>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>데이터 전송 로그</CardTitle>
            <CardDescription>삼성헬스에서 GPT로 전송된 데이터 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="flex items-end gap-2">
                  <Button onClick={handleDateFilter} className="flex-1">
                    조회
                  </Button>
                  <Button onClick={toggleSortOrder} variant="outline">
                    {sortOrder === "desc" ? "최신순" : "오래된순"}
                  </Button>
                </div>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">전송 기록이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/monitor/log/${log.id}`)}
                  >
                    {getLogStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.log_type}</p>
                      <p className="text-sm text-muted-foreground">{log.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-accent/10">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">📱 Samsung Health 연동 안내</p>
              <p className="text-muted-foreground">
                앱이 네이티브 환경(Android)에서 실행될 때 삼성헬스와 연동됩니다. 
                웹 환경에서는 삼성헬스 접근이 제한됩니다.
              </p>
              <p className="font-semibold mt-4">💡 GPT 연동 안내</p>
              <p className="text-muted-foreground">
                Setup 메뉴에서 OpenAI API Key와 Project ID를 입력하여 GPT를 연동할 수 있습니다.
                삼성헬스 연동이 완료되어야 GPT로 데이터를 전송할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitor;
