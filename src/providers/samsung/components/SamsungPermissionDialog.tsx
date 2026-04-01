import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SamsungPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function SamsungPermissionDialog({
  open,
  onOpenChange,
  onConfirm,
}: SamsungPermissionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Samsung Health 연결 권한 필요</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold">건강 데이터를 수집하려면 아래 권한이 필요합니다.</p>

            <div className="space-y-2 text-sm">
              <p className="font-medium">필수 권한</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Health Connect 건강 데이터 읽기</li>
                <li>신체 활동 기록 접근</li>
                <li>수면, 심박수, 영양 정보 접근</li>
              </ul>
            </div>

            <p className="text-sm font-medium mt-4">권한 설정 방법</p>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
              <li>앱 설정에서 권한 요청을 승인합니다.</li>
              <li>필요하면 Health Connect 앱 설정으로 이동합니다.</li>
              <li>Samsung Health 데이터 접근을 허용합니다.</li>
            </ol>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              localStorage.setItem("permission_dialog_dismissed_until", tomorrow.toISOString());
              onOpenChange(false);
            }}
          >
            하루 동안 보지 않기
          </Button>
          <AlertDialogAction onClick={onConfirm}>
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
