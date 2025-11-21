import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

interface LogEntry {
  timestamp: string;
  type: "samsung" | "gpt";
  status: "success" | "error" | "pending";
  message: string;
}

const Monitor = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [samsungHealthStatus, setSamsungHealthStatus] = useState<"connected" | "disconnected">("disconnected");
  const [gptStatus, setGptStatus] = useState<"connected" | "disconnected">("disconnected");

  useEffect(() => {
    checkConnections();
    fetchRecentLogs();
  }, []);

  const checkConnections = () => {
    // Check Samsung Health connection status
    // This will be implemented with actual Samsung Health SDK
    setSamsungHealthStatus("disconnected");
    
    // Check GPT connection status
    checkGPTConnection();
  };

  const checkGPTConnection = async () => {
    try {
      const { data, error } = await supabase.from("health_data").select("*").limit(1);
      if (!error && data) {
        setGptStatus("connected");
      }
    } catch (error) {
      setGptStatus("disconnected");
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("health_data")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        const logEntries: LogEntry[] = data.map((record) => ({
          timestamp: new Date(record.synced_at).toLocaleString("ko-KR"),
          type: "gpt",
          status: "success",
          message: `데이터 전송 완료 (ID: ${record.id.slice(0, 8)})`,
        }));
        setLogs(logEntries);
      }
    } catch (error) {
      console.error("로그 조회 실패:", error);
    }
  };

  const getStatusIcon = (status: "connected" | "disconnected") => {
    return status === "connected" ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getLogStatusIcon = (status: "success" | "error" | "pending") => {
    if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">모니터링</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                삼성헬스 연결 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-lg">연결 상태</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(samsungHealthStatus)}
                  <Badge variant={samsungHealthStatus === "connected" ? "default" : "destructive"}>
                    {samsungHealthStatus === "connected" ? "연결됨" : "연결 안됨"}
                  </Badge>
                </div>
              </div>
              {samsungHealthStatus === "disconnected" && (
                <p className="text-sm text-muted-foreground mt-4">
                  네이티브 앱 환경에서 삼성헬스 연동이 활성화됩니다.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                GPT 연결 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-lg">연결 상태</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(gptStatus)}
                  <Badge variant={gptStatus === "connected" ? "default" : "destructive"}>
                    {gptStatus === "connected" ? "연결됨" : "연결 안됨"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>전송 로그</CardTitle>
            <CardDescription>최근 데이터 전송 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  아직 전송된 데이터가 없습니다.
                </p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/20 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      {getLogStatusIcon(log.status)}
                      <div>
                        <p className="text-sm font-medium">{log.message}</p>
                        <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {log.type === "samsung" ? "삼성헬스" : "GPT"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>실제 삼성헬스 연동 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-primary">현재 상태: 웹 미리보기 환경</p>
            <p>실제 삼성헬스 데이터를 수집하려면 다음 단계가 필요합니다:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>프로젝트를 GitHub로 내보내기</li>
              <li>로컬에서 git pull 실행</li>
              <li>npm install 실행</li>
              <li>npx cap add android 실행</li>
              <li>Android Studio에서 프로젝트 열기</li>
              <li>삼성 Health SDK 또는 Health Connect API 통합</li>
              <li>네이티브 브릿지 코드 작성</li>
              <li>실제 Android 기기에서 테스트</li>
            </ol>
            <p className="mt-4 text-muted-foreground">
              웹 환경에서는 보안상의 이유로 직접적인 삼성헬스 접근이 불가능합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitor;
