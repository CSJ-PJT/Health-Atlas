import { useMemo, useState } from "react";
import { MessageSquareText, Save } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHealthStats, useTodayHealth } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { saveAdviceArchive } from "@/services/adviceArchive";

export const AdviceDrawer = () => {
  const providerId = getStoredProviderId();
  const providerMeta = getProviderMeta(providerId);
  const { data: todayData } = useTodayHealth();
  const { data: weeklyRecords = [] } = useHealthStats("week");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);

  const adviceSummary = useMemo(() => {
    if (!todayData) {
      return "오늘 기록이 아직 없어 분석을 시작할 수 없습니다.";
    }

    const todayRun = weeklyRecords[weeklyRecords.length - 1]?.running_data?.summary;
    const previousRun = weeklyRecords[weeklyRecords.length - 2]?.running_data?.summary;

    if (!todayRun) {
      return "오늘 러닝 데이터가 아직 집계되지 않았습니다.";
    }

    const paceTrend =
      previousRun && todayRun.avgPace < previousRun.avgPace
        ? "평균 페이스가 직전 기록보다 좋아졌습니다."
        : previousRun
          ? "평균 페이스가 직전 기록보다 소폭 느려졌습니다."
          : "비교할 직전 기록이 아직 부족합니다.";

    return `${providerMeta.label} 기준 오늘 러닝 ${todayRun.distanceKm}km, ${todayRun.durationMinutes}분입니다. ${paceTrend} 심박수는 평균 ${todayRun.avgHeartRate}bpm이며 케이던스는 ${todayRun.cadence}spm입니다.`;
  }, [providerMeta.label, todayData, weeklyRecords]);

  const handleGenerateReply = () => {
    if (!draft.trim()) {
      return;
    }

    const userMessage = draft.trim();
    const assistantMessage = `기록 기준 답변입니다. 오늘 거리와 페이스 추이를 보면 "${userMessage}"에 대해 러닝 강도를 약간 낮추고 회복 시간을 확보하는 편이 좋습니다. 내일은 케이던스를 유지하면서 거리보다는 페이스 안정화에 집중하세요.`;

    setConversation((previous) => [
      ...previous,
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage },
    ]);
    setDraft("");
  };

  const handleSaveAndClose = () => {
    saveAdviceArchive({
      id: `${Date.now()}`,
      providerId,
      createdAt: new Date().toISOString(),
      summary: adviceSummary,
      conversation,
    });
    setConversation([]);
    setDraft("");
    setOpen(false);
    setCloseConfirmOpen(false);
  };

  const handleCloseWithoutSave = () => {
    setConversation([]);
    setDraft("");
    setOpen(false);
    setCloseConfirmOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : setCloseConfirmOpen(true))}>
        <SheetTrigger asChild>
          <Button className="flex flex-col items-center gap-1 rounded-lg bg-white px-3 py-2 shadow-sm transition-colors hover:bg-white/90 dark:bg-card dark:hover:bg-card/90">
            <MessageSquareText className="h-6 w-6" />
            <span className="text-xs text-gray-700 dark:text-foreground">AI 코치</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>오늘 기록 AI 코치</SheetTitle>
            <SheetDescription>{providerMeta.label} 기록과 최근 추이를 기준으로 조언을 제공합니다.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">자동 분석</div>
              <p className="mt-2 text-sm text-muted-foreground">{adviceSummary}</p>
            </div>

            <div className="space-y-3">
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg p-3 text-sm ${
                    message.role === "assistant" ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <div className="mb-1 text-xs text-muted-foreground">{message.role === "assistant" ? "AI 코치" : "나"}</div>
                  <div>{message.content}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="오늘 기록과 추이에 대해 질문하거나 메모를 남기세요."
                className="min-h-28"
              />
              <Button onClick={handleGenerateReply} className="w-full">대화 추가</Button>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" className="w-full" onClick={() => setCloseConfirmOpen(true)}>
              종료
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 내용을 저장할까요?</AlertDialogTitle>
            <AlertDialogDescription>종료 전 아카이브에 저장하거나, 저장 없이 닫을 수 있습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseWithoutSave}>그냥 종료</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              <Save className="mr-2 h-4 w-4" />
              저장 후 종료
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
