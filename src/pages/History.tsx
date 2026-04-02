import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { RouteMapCard } from "@/components/health/RouteMapCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealthHistory } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import type { HealthViewMode } from "@/providers/shared/types/provider";
import { isDisplayMetricEnabled } from "@/services/displaySettings";
import { buildRangeFromMode, getModeLabel } from "@/utils/dateRange";
import { aggregateRunningChartData } from "@/utils/healthCharts";

const summaryLineOptions = [
  { key: "distanceKm", name: "거리(km)", color: "#8b5cf6" },
  { key: "durationMinutes", name: "시간(분)", color: "#06b6d4" },
  { key: "avgPace", name: "평균 페이스", color: "#ef4444" },
  { key: "bestPace", name: "최고 페이스", color: "#f97316" },
  { key: "averageSpeed", name: "평균 시속", color: "#22c55e" },
  { key: "maxSpeed", name: "최고 시속", color: "#f59e0b" },
];

const sessionLineOptions = [
  ...summaryLineOptions,
  { key: "avgHeartRate", name: "평균 심박수", color: "#ec4899" },
  { key: "cadence", name: "평균 케이던스", color: "#6366f1" },
];

const formatPace = (secondsPerKm?: number) => {
  if (!secondsPerKm) {
    return "-";
  }

  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

const History = () => {
  const providerId = getStoredProviderId();
  const providerMeta = getProviderMeta(providerId);
  const initialRange = buildRangeFromMode("week");
  const [viewMode, setViewMode] = useState<HealthViewMode>("week");
  const [startDate, setStartDate] = useState<Date | undefined>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | undefined>(initialRange.end);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [visibleSummaryKeys, setVisibleSummaryKeys] = useState<string[]>(summaryLineOptions.map((item) => item.key));
  const [visibleSessionKeys, setVisibleSessionKeys] = useState<string[]>(sessionLineOptions.map((item) => item.key));

  useEffect(() => {
    const nextRange = buildRangeFromMode(viewMode);
    setStartDate(nextRange.start);
    setEndDate(nextRange.end);
  }, [viewMode]);

  const { data: records = [], isLoading } = useHealthHistory(viewMode, startDate, endDate);
  const fallbackRecords = useMemo(() => getMockHealthHistory(providerId), [providerId]);
  const effectiveRecords = records.length > 0 ? records : fallbackRecords;
  const latestRecord = effectiveRecords[effectiveRecords.length - 1];
  const isSingleDayRange =
    !!startDate && !!endDate && differenceInCalendarDays(endDate, startDate) === 0;

  const runningSessions = useMemo(
    () => (latestRecord?.running_data?.sessions || []).filter(Boolean),
    [latestRecord],
  );

  useEffect(() => {
    if (!selectedSessionId && runningSessions[0]?.activityId) {
      setSelectedSessionId(runningSessions[0].activityId);
    }
  }, [runningSessions, selectedSessionId]);

  const selectedSession =
    runningSessions.find((session: any) => session.activityId === selectedSessionId) || runningSessions[0];

  const summaryChartData = useMemo(() => {
    if (isSingleDayRange) {
      return latestRecord?.running_data?.hourly_series || [];
    }

    return aggregateRunningChartData(effectiveRecords, viewMode);
  }, [effectiveRecords, isSingleDayRange, latestRecord, viewMode]);

  const sessionChartData = selectedSession
    ? latestRecord?.running_data?.session_timelines?.[selectedSession.activityId] || []
    : [];

  const summary = latestRecord?.running_data?.summary;

  const summaryCards = summary
    ? [
        { key: "avgPace", label: "평균 페이스", value: formatPace(summary.avgPace * 60) },
        { key: "bestPace", label: "최고 페이스", value: formatPace(summary.bestPace * 60) },
        { key: "averageSpeed", label: "평균 시속", value: `${summary.averageSpeed} km/h` },
        { key: "maxSpeed", label: "최고 시속", value: `${summary.maxSpeed} km/h` },
        { key: "distanceKm", label: "운동 거리", value: `${summary.distanceKm} km` },
        { key: "durationMinutes", label: "운동 시간", value: `${summary.durationMinutes} 분` },
        { key: "avgHeartRate", label: "평균 심박수", value: `${summary.avgHeartRate} bpm` },
        { key: "cadence", label: "평균 케이던스", value: `${summary.cadence} spm` },
      ]
        .filter((item) => isDisplayMetricEnabled("history", item.key))
        .map(({ label, value }) => ({ label, value }))
    : [];

  const sessionCards = selectedSession
    ? [
        { key: "activityName", label: "운동 이름", value: selectedSession.activityName },
        { key: "activityType", label: "운동 유형", value: selectedSession.activityType },
        { key: "durationMinutes", label: "운동 시간", value: `${Math.round(selectedSession.durationSeconds / 60)} 분` },
        { key: "distanceKm", label: "운동 거리", value: `${(selectedSession.distanceMeters / 1000).toFixed(2)} km` },
        { key: "avgPace", label: "평균 페이스", value: formatPace(selectedSession.averagePaceSecondsPerKilometer) },
        { key: "bestPace", label: "최고 페이스", value: formatPace(selectedSession.bestPaceSecondsPerKilometer) },
        { key: "averageSpeed", label: "평균 시속", value: `${(selectedSession.averageSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
        { key: "maxSpeed", label: "최고 시속", value: `${(selectedSession.maxSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
        { key: "avgHeartRate", label: "평균 심박수", value: `${selectedSession.averageHR} bpm` },
        { key: "maxHeartRate", label: "최대 심박수", value: `${selectedSession.maxHR} bpm` },
        { key: "cadence", label: "평균 케이던스", value: `${selectedSession.averageRunCadence} spm` },
        { key: "maxCadence", label: "최대 케이던스", value: `${selectedSession.maxRunCadence} spm` },
        { key: "elevationGain", label: "총 상승", value: `${selectedSession.elevationGainMeters} m` },
        { key: "elevationLoss", label: "총 하강", value: `${selectedSession.elevationLossMeters} m` },
        { key: "vo2max", label: "VO2 Max", value: selectedSession.vo2Max },
        { key: "calories", label: "칼로리", value: `${selectedSession.calories} kcal` },
        { key: "trainingEffectLabel", label: "기본 효과", value: selectedSession.trainingEffectLabel || "-" },
        { key: "trainingEffectAerobic", label: "유산소 효과", value: selectedSession.trainingEffectAerobic || "-" },
        { key: "trainingEffectAnaerobic", label: "무산소 효과", value: selectedSession.trainingEffectAnaerobic || "-" },
        { key: "trainingLoad", label: "운동 부하", value: selectedSession.trainingLoad || "-" },
        { key: "estimatedSweatLossMl", label: "예상 수분 손실", value: `${selectedSession.estimatedSweatLossMl || 0} ml` },
        { key: "averageStrideLengthMeters", label: "보폭", value: `${selectedSession.averageStrideLengthMeters || 0} m` },
        { key: "steps", label: "걸음 수", value: `${selectedSession.steps || 0} 걸음` },
      ]
        .filter((item) => {
          if (item.key === "activityName" || item.key === "activityType") {
            return true;
          }
          return isDisplayMetricEnabled("history", item.key);
        })
        .map(({ label, value }) => ({ label, value }))
    : [];

  const toggleSummaryMetric = (key: string) => {
    setVisibleSummaryKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key],
    );
  };

  const toggleSessionMetric = (key: string) => {
    setVisibleSessionKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key],
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <ScrollToTop />
        <div className="mx-auto max-w-6xl space-y-4 p-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">기록</h1>
          <p className="text-sm text-muted-foreground">{providerMeta.label} 기준 운동 기록을 확인합니다.</p>
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

        {effectiveRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">표시할 기록 데이터가 없습니다.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>기록 요약</CardTitle>
                <CardDescription>
                  {isSingleDayRange
                    ? "하루만 지정한 경우 00시부터 24시까지 시간 흐름으로 보여줍니다."
                    : "이틀 이상 선택한 경우 날짜 단위로 집계해서 보여줍니다."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MetricLineChart
                  data={summaryChartData}
                  xKey={isSingleDayRange ? "time" : "date"}
                  lines={summaryLineOptions.filter((line) => visibleSummaryKeys.includes(line.key) && isDisplayMetricEnabled("history", line.key))}
                />
                <div className="flex flex-wrap gap-3 text-sm">
                  {summaryLineOptions.filter((line) => isDisplayMetricEnabled("history", line.key)).map((line) => {
                    const active = visibleSummaryKeys.includes(line.key);
                    return (
                      <button
                        key={line.key}
                        type="button"
                        onClick={() => toggleSummaryMetric(line.key)}
                        className="font-medium transition-opacity"
                        style={{ color: active ? line.color : "#9ca3af", opacity: active ? 1 : 0.8 }}
                      >
                        {line.name}
                      </button>
                    );
                  })}
                </div>
                <MetricGrid items={summaryCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>운동별 상세 기록</CardTitle>
                    <CardDescription>운동 버튼을 누르면 시작 시점부터 종료 시점까지 상세 그래프를 보여줍니다.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {runningSessions.map((session: any) => (
                      <Button
                        key={session.activityId}
                        variant={selectedSession?.activityId === session.activityId ? "default" : "outline"}
                        onClick={() => setSelectedSessionId(session.activityId)}
                        className="text-xs"
                      >
                        {session.activityName}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedSession ? (
                  <>
                    <MetricLineChart
                      data={sessionChartData}
                      xKey="time"
                      lines={sessionLineOptions.filter((line) => visibleSessionKeys.includes(line.key) && isDisplayMetricEnabled("history", line.key))}
                    />
                    <div className="flex flex-wrap gap-3 text-sm">
                      {sessionLineOptions.filter((line) => isDisplayMetricEnabled("history", line.key)).map((line) => {
                        const active = visibleSessionKeys.includes(line.key);
                        return (
                          <button
                            key={line.key}
                            type="button"
                            onClick={() => toggleSessionMetric(line.key)}
                            className="font-medium transition-opacity"
                            style={{ color: active ? line.color : "#9ca3af", opacity: active ? 1 : 0.8 }}
                          >
                            {line.name}
                          </button>
                        );
                      })}
                    </div>
                    <MetricGrid items={sessionCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
                    <RouteMapCard points={selectedSession.routePoints} title="운동 경로" />
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">선택 가능한 운동 데이터가 없습니다.</div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default History;
