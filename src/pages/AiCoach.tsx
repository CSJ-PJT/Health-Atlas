import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useHealthStats } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { buildAiCoachSummary } from "@/services/aiCoach";
import { saveAdviceArchive } from "@/services/adviceArchive";
import { sendAiCoachMessage } from "@/services/openaiClient";

const AiCoach = () => {
  const navigate = useNavigate();
  const providerId = getStoredProviderId();
  const providerMeta = getProviderMeta(providerId);
  const { data: yearlyRecords = [] } = useHealthStats("year");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);

  const summary = useMemo(() => buildAiCoachSummary(yearlyRecords as any[], providerMeta.label, new Date()), [providerMeta.label, yearlyRecords]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }

    const userMessage = draft.trim();
    setConversation((previous) => [...previous, { role: "user", content: userMessage }]);
    setDraft("");
    setIsLoading(true);

    try {
      const answer = await sendAiCoachMessage(userMessage, `${summary}\n최근 기록 개수: ${yearlyRecords.length}`);
      setConversation((previous) => [...previous, { role: "assistant", content: answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 답변 생성에 실패했습니다.";
      setConversation((previous) => [...previous, { role: "assistant", content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    saveAdviceArchive({
      id: `${Date.now()}`,
      providerId,
      createdAt: new Date().toISOString(),
      summary,
      conversation,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            뒤로가기
          </Button>
          <Button variant="outline" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            보관
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI 코치</CardTitle>
            <CardDescription>{providerMeta.label} 기록을 바탕으로 실제 GPT와 대화합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">{summary}</div>
            <div className="space-y-3">
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg p-3 text-sm ${
                    message.role === "assistant" ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <div className="mb-1 text-xs text-muted-foreground">{message.role === "assistant" ? "AI 코치" : "나"}</div>
                  <div>{message.content}</div>
                </div>
              ))}
            </div>
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="질문을 입력하세요." className="min-h-32" />
            <Button onClick={() => void handleSend()} disabled={isLoading} className="w-full">
              {isLoading ? "응답 생성 중..." : "질문 보내기"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiCoach;
