import { useMemo, useState } from "react";
import { MessageSquareText, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useHealthStats } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { buildAiCoachSummary } from "@/services/aiCoach";
import { saveAdviceArchive } from "@/services/adviceArchive";

export const AdviceDrawer = () => {
  const providerId = getStoredProviderId();
  const providerMeta = getProviderMeta(providerId);
  const { data: yearlyRecords = [] } = useHealthStats("year");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);

  const adviceSummary = useMemo(
    () => buildAiCoachSummary(yearlyRecords as any[], providerMeta.label, new Date()),
    [providerMeta.label, yearlyRecords],
  );

  const handleGenerateReply = () => {
    if (!draft.trim()) {
      return;
    }

    const userMessage = draft.trim();
    const assistantMessage = `${adviceSummary} 질문 "${userMessage}"에 대한 답으로는 오늘은 거리보다 회복, 수면, 수분 보충을 우선순위로 두는 것이 좋습니다. 내일 기록 비교를 위해 저녁 컨디션도 짧게 메모해 두세요.`;

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
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setOpen(true);
          } else {
            setCloseConfirmOpen(true);
          }
        }}
      >
        <SheetTrigger asChild>
          <Button size="sm" className="gap-2">
            <MessageSquareText className="h-4 w-4" />
            AI 코치
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>오늘 기록 AI 코치</SheetTitle>
            <SheetDescription>{providerMeta.label} 기록과 최근 추이를 기준으로 요약과 대화를 제공합니다.</SheetDescription>
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
                placeholder="오늘 기록이나 추이에 대해 질문하거나 메모를 남겨보세요."
                className="min-h-28"
              />
              <Button onClick={handleGenerateReply} className="w-full">
                대화 추가
              </Button>
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
            <AlertDialogTitle>대화 내용을 저장할까요?</AlertDialogTitle>
            <AlertDialogDescription>종료 전에 아카이브에 저장하거나, 저장 없이 닫을 수 있습니다.</AlertDialogDescription>
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
