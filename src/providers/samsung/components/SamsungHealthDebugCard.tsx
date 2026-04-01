import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CheckPermissionsResult, HealthSummary } from "@/lib/healthConnect";

interface SamsungHealthDebugCardProps {
  permissionResult: CheckPermissionsResult | null;
  healthSummary: HealthSummary | null;
  onCheckPermissions: () => void | Promise<void>;
  onRequestPermissions: () => void | Promise<void>;
  onOpenSettings: () => void | Promise<void>;
  onReadSummary: () => void | Promise<void>;
}

export function SamsungHealthDebugCard({
  permissionResult,
  healthSummary,
  onCheckPermissions,
  onRequestPermissions,
  onOpenSettings,
  onReadSummary,
}: SamsungHealthDebugCardProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-700">Health Connect 테스트</CardTitle>
        <CardDescription>Kotlin 플러그인 연결 테스트</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onCheckPermissions} variant="outline">
            권한 확인
          </Button>
          <Button onClick={onRequestPermissions} variant="default">
            권한 요청
          </Button>
          <Button onClick={onOpenSettings} variant="outline">
            설정 열기
          </Button>
          <Button onClick={onReadSummary} variant="default">
            요약 읽기
          </Button>
        </div>

        {permissionResult && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm">권한 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded">
                {JSON.stringify(permissionResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {healthSummary && (
          <>
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-sm">데이터 요약</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">걸음수</p>
                  <p className="text-lg font-bold">{healthSummary.steps?.length || 0}건</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">심박수</p>
                  <p className="text-lg font-bold">{healthSummary.heartRate?.length || 0}건</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">운동</p>
                  <p className="text-lg font-bold">{healthSummary.exercises?.length || 0}건</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">수면</p>
                  <p className="text-lg font-bold">{healthSummary.sleepSessions?.length || 0}건</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">체중</p>
                  <p className="text-lg font-bold">{healthSummary.body?.weight?.length || 0}건</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">체지방</p>
                  <p className="text-lg font-bold">{healthSummary.body?.bodyFat?.length || 0}건</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">영양</p>
                  <p className="text-lg font-bold">{healthSummary.nutrition?.length || 0}건</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-sm">전체 JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded max-h-96">
                  {JSON.stringify(healthSummary, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
