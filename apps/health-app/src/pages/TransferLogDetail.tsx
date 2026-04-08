import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";

interface TransferLog {
  id: string;
  created_at: string;
  log_type: string;
  status: "success" | "error" | "pending";
  message: string;
}

const TransferLogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState<TransferLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLog();
  }, [id]);

  const fetchLog = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        console.log("No profile ID found");
        return;
      }

      const { data, error } = await supabase
        .from("transfer_logs")
        .select("*")
        .eq("id", id)
        .eq("profile_id", profileId)
        .single();

      if (error) throw error;
      setLog(data as TransferLog);
    } catch (error) {
      console.error("Error fetching log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: "success" | "error" | "pending") => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "error":
        return <XCircle className="h-8 w-8 text-red-500" />;
      case "pending":
        return <Clock className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getStatusText = (status: "success" | "error" | "pending") => {
    switch (status) {
      case "success":
        return "성공";
      case "error":
        return "실패";
      case "pending":
        return "진행 중";
    }
  };

  const getStatusColor = (status: "success" | "error" | "pending") => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "error":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header showNav={true} />
        <ScrollToTop />
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header showNav={true} />
        <ScrollToTop />
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Button onClick={() => navigate("/monitor")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">로그를 찾을 수 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Button onClick={() => navigate("/monitor")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(log.status)}
              전송 로그 상세
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">로그 타입</label>
                <p className="text-lg font-medium">{log.log_type}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">상태</label>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(log.status)}`}>
                  {getStatusIcon(log.status)}
                  <span className="font-medium">{getStatusText(log.status)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">메시지</label>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm whitespace-pre-wrap">{log.message}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">생성 시간</label>
                <p className="text-sm">{new Date(log.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">로그 ID</label>
                <p className="text-xs text-muted-foreground font-mono">{log.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {log.status === "error" && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">오류 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">오류 해결 방법:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {log.log_type === "삼성헬스 연동" && (
                    <>
                      <li>삼성헬스 앱이 설치되어 있는지 확인하세요.</li>
                      <li>앱 설정에서 삼성헬스 접근 권한을 허용했는지 확인하세요.</li>
                      <li>네이티브 Android 앱에서 실행 중인지 확인하세요.</li>
                    </>
                  )}
                  {log.log_type === "GPT 연동" && (
                    <>
                      <li>Setup 메뉴에서 OpenAI API Key가 올바르게 설정되어 있는지 확인하세요.</li>
                      <li>OpenAI API Key가 유효하고 충분한 크레딧이 있는지 확인하세요.</li>
                      <li>인터넷 연결 상태를 확인하세요.</li>
                      <li>삼성헬스 연동이 먼저 완료되어 있는지 확인하세요.</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TransferLogDetail;
