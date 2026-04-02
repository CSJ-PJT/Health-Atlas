import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHealthStats } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import type { HealthViewMode } from "@/providers/shared/types/provider";
import { isDisplayMetricEnabled } from "@/services/displaySettings";
import { buildAiRecommendation } from "@/services/aiCoach";
import { buildRangeFromMode, getModeLabel } from "@/utils/dateRange";
import { aggregateRunningChartData } from "@/utils/healthCharts";

const metricOptions = [
  { key: "distanceKm", name: "거리(km)", color: "#8b5cf6" },
  { key: "durationMinutes", name: "시간(분)", color: "#06b6d4" },
  { key: "avgPace", name: "평균 페이스", color: "#ef4444" },
  { key: "bestPace", name: "최고 페이스", color: "#f97316" },
  { key: "averageSpeed", name: "평균 시속", color: "#22c55e" },
  { key: "maxSpeed", name: "최고 시속", color: "#f59e0b" },
  { key: "avgHeartRate", name: "평균 심박수", color: "#ec4899" },
  { key: "cadence", name: "평균 케이던스", color: "#6366f1" },
  { key: "vo2max", name: "VO2 Max", color: "#14b8a6" },
  { key: "elevationGain", name: "총 상승", color: "#84cc16" },
];

const toPaceLabel = (minutesValue: number) => {
  const totalSeconds = Math.round(minutesValue * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

const Comparison = () => {
  const providerId = getStoredProviderId();
  const providerMeta = getProviderMeta(providerId);
  const initialRange = buildRangeFromMode("week");
  const [viewMode, setViewMode] = useState<HealthViewMode>("week");
  const [startDate, setStartDate] = useState<Date | undefined>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | undefined>(initialRange.end);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(metricOptions.map((metric) => metric.key));
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [analysisTab, setAnalysisTab] = useState<"summary" | "laps">("summary");

  useEffect(() => {
    const nextRange = buildRangeFromMode(viewMode);
    setStartDate(nextRange.start);
    setEndDate(nextRange.end);
  }, [viewMode]);

  const { data: records = [], isLoading } = useHealthStats(viewMode, startDate, endDate);
  const fallbackRecords = useMemo(() => getMockHealthHistory(providerId), [providerId]);
  const effectiveRecords = records.length > 0 ? records : fallbackRecords;
  const latestRecord = effectiveRecords[effectiveRecords.length - 1];
  const sessions = latestRecord?.running_data?.sessions || [];
  const isSingleDayRange =
    !!startDate && !!endDate && differenceInCalendarDays(endDate, startDate) === 0;

  useEffect(() => {
    if (!selectedSessionId && sessions[0]?.activityId) {
      setSelectedSessionId(sessions[0].activityId);
    }
  }, [sessions, selectedSessionId]);

  const selectedSession = sessions.find((session: any) => session.activityId === selectedSessionId) || sessions[0];
  const dayTimeline = selectedSession ? latestRecord?.running_data?.session_timelines?.[selectedSession.activityId] || [] : [];
  const laps = selectedSession ? latestRecord?.running_data?.session_laps?.[selectedSession.activityId] || [] : [];

  const aggregateChartData = useMemo(() => aggregateRunningChartData(effectiveRecords, viewMode), [effectiveRecords, viewMode]);
  const chartData = isSingleDayRange ? dayTimeline : aggregateChartData;
  const latest = chartData[chartData.length - 1];

  const toggleMetric = (key: string) => {
    setVisibleKeys((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]));
  };

  const visibleLines = metricOptions.filter((metric) => visibleKeys.includes(metric.key) && isDisplayMetricEnabled("comparison", metric.key));
  const summaryCards = latest
    ? metricOptions
        .filter((metric) => isDisplayMetricEnabled("comparison", metric.key))
        .map((metric) => ({
          label: metric.name,
          value:
            metric.key === "avgPace" || metric.key === "bestPace"
              ? toPaceLabel(Number((latest as any)[metric.key] || 0))
              : metric.key === "distanceKm"
                ? `${(latest as any)[metric.key]} km`
                : metric.key === "durationMinutes"
                  ? `${(latest as any)[metric.key]} 분`
                  : metric.key.includes("Speed")
                    ? `${(latest as any)[metric.key]} km/h`
                    : metric.key.includes("HeartRate")
                      ? `${(latest as any)[metric.key]} bpm`
                      : metric.key === "cadence"
                        ? `${(latest as any)[metric.key]} spm`
                        : metric.key === "elevationGain"
                          ? `${(latest as any)[metric.key]} m`
                          : `${(latest as any)[metric.key]}`,
        }))
    : [];

  const sessionAiSummary = selectedSession
    ? [
        `${selectedSession.activityName}은 ${Math.round(selectedSession.durationSeconds / 60)}분 동안 ${(selectedSession.distanceMeters / 1000).toFixed(2)}km를 수행한 ${selectedSession.activityType} 운동입니다.`,
        `평균 심박수 ${selectedSession.averageHR}bpm, 최대 심박수 ${selectedSession.maxHR}bpm, 평균 케이던스 ${selectedSession.averageRunCadence}spm입니다.`,
        `운동 부하 ${selectedSession.trainingLoad || 0}, 유산소 효과 ${selectedSession.trainingEffectAerobic || 0}, 무산소 효과 ${selectedSession.trainingEffectAnaerobic || 0} 기준으로 보면 ${
          selectedSession.trainingEffectAerobic && selectedSession.trainingEffectAerobic > 3 ? "자극이 충분한 세션" : "회복 중심 세션"
        }입니다.`,
        buildAiRecommendation(effectiveRecords as any[], new Date()),
      ].join(" ")
    : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <div className="mx-auto max-w-6xl space-y-4 p-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{providerMeta.shortLabel} 러닝 비교</h1>
          <p className="text-sm text-muted-foreground">{providerMeta.label} 기준 러닝 비교 화면입니다.</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month", "year"] as HealthViewMode[]).map((mode) => (
              <Button key={mode} variant={viewMode === mode ? "default" : "outline"} onClick={() => setViewMode(mode)}>
                {getModeLabel(mode)}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "yyyy-MM-dd") : "시작일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "yyyy-MM-dd") : "종료일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>러닝 요약</CardTitle>
            <CardDescription>
              {isSingleDayRange
                ? "하루만 지정하면 선택한 운동의 시작 시점부터 종료 시점까지 시간축으로 보여줍니다."
                : "하루 이상 선택하면 날짜 단위로 집계해서 비교합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MetricLineChart data={chartData} xKey={isSingleDayRange ? "time" : "date"} lines={visibleLines} />
            <div className="flex flex-wrap gap-3 text-sm">
              {metricOptions
                .filter((metric) => isDisplayMetricEnabled("comparison", metric.key))
                .map((metric) => {
                  const active = visibleKeys.includes(metric.key);
                  return (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => toggleMetric(metric.key)}
                      className="font-medium transition-opacity"
                      style={{ color: active ? metric.color : "#9ca3af", opacity: active ? 1 : 0.8 }}
                    >
                      {metric.name}
                    </button>
                  );
                })}
            </div>
            <MetricGrid items={summaryCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>러닝 분석</CardTitle>
            <CardDescription>운동별로 탭을 나누고 종합 분석과 랩 분석을 확인할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
                {sessions.map((session: any) => (
                  <TabsTrigger key={session.activityId} value={session.activityId}>
                    {session.activityName}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sessions.map((session: any) => (
                <TabsContent key={session.activityId} value={session.activityId} className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button variant={analysisTab === "summary" ? "default" : "outline"} onClick={() => setAnalysisTab("summary")}>
                      종합 분석
                    </Button>
                    <Button variant={analysisTab === "laps" ? "default" : "outline"} onClick={() => setAnalysisTab("laps")}>
                      랩 분석
                    </Button>
                  </div>

                  {analysisTab === "summary" ? (
                    <>
                      <div className="rounded-lg border p-4 text-sm text-muted-foreground">{sessionAiSummary}</div>
                      <MetricGrid
                        items={[
                          { label: "운동 거리", value: `${(session.distanceMeters / 1000).toFixed(2)} km` },
                          { label: "운동 시간", value: `${Math.round(session.durationSeconds / 60)} 분` },
                          { label: "평균 페이스", value: toPaceLabel(Number(session.averagePaceSecondsPerKilometer || 0) / 60) },
                          { label: "최고 페이스", value: toPaceLabel(Number(session.bestPaceSecondsPerKilometer || 0) / 60) },
                          { label: "평균 시속", value: `${(session.averageSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
                          { label: "최고 시속", value: `${(session.maxSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
                          { label: "평균 심박수", value: `${session.averageHR} bpm` },
                          { label: "최대 심박수", value: `${session.maxHR} bpm` },
                          { label: "평균 케이던스", value: `${session.averageRunCadence} spm` },
                          { label: "최대 케이던스", value: `${session.maxRunCadence} spm` },
                          { label: "기본 효과", value: session.trainingEffectLabel || "-" },
                          { label: "유산소 효과", value: session.trainingEffectAerobic || "-" },
                          { label: "무산소 효과", value: session.trainingEffectAnaerobic || "-" },
                          { label: "운동 부하", value: session.trainingLoad || "-" },
                          { label: "총 상승", value: `${session.elevationGainMeters} m` },
                          { label: "총 하강", value: `${session.elevationLossMeters} m` },
                          { label: "예상 수분 손실", value: `${session.estimatedSweatLossMl || 0} ml` },
                          { label: "보폭", value: `${session.averageStrideLengthMeters} m` },
                          { label: "걸음 수", value: `${session.steps || 0} 걸음` },
                          { label: "VO2 Max", value: session.vo2Max },
                        ]}
                        columnsClassName="grid-cols-2 md:grid-cols-4"
                      />
                    </>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-left">랩</th>
                            <th className="px-3 py-2 text-left">거리</th>
                            <th className="px-3 py-2 text-left">시간</th>
                            <th className="px-3 py-2 text-left">페이스</th>
                            <th className="px-3 py-2 text-left">심박수</th>
                            <th className="px-3 py-2 text-left">케이던스</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laps.map((lap: any) => (
                            <tr key={lap.lapNumber} className="border-t">
                              <td className="px-3 py-2">{lap.lapNumber}</td>
                              <td className="px-3 py-2">{lap.distanceKm} km</td>
                              <td className="px-3 py-2">{lap.duration}</td>
                              <td className="px-3 py-2">{lap.pace}</td>
                              <td className="px-3 py-2">{lap.avgHeartRate} bpm</td>
                              <td className="px-3 py-2">{lap.cadence} spm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Comparison;
