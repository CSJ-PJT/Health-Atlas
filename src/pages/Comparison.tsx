import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealthStats } from "@/hooks/useHealthData";
import { getProviderMeta, getStoredProviderId } from "@/providers/shared";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import type { HealthViewMode } from "@/providers/shared/types/provider";
import { buildRangeFromMode, getModeLabel } from "@/utils/dateRange";
import { aggregateRunningChartData } from "@/utils/healthCharts";

const overviewMetricOptions = [
  { key: "distanceKm", name: "거리(km)", color: "#8b5cf6" },
  { key: "durationMinutes", name: "시간(분)", color: "#06b6d4" },
  { key: "avgPace", name: "평균 페이스", color: "#ef4444" },
  { key: "bestPace", name: "최고 페이스", color: "#f97316" },
  { key: "averageSpeed", name: "평균 시속", color: "#22c55e" },
  { key: "maxSpeed", name: "최고 시속", color: "#f59e0b" },
  { key: "avgHeartRate", name: "평균 심박수", color: "#ec4899" },
  { key: "cadence", name: "평균 케이던스", color: "#6366f1" },
  { key: "vo2max", name: "VO2 Max", color: "#14b8a6" },
  { key: "elevationGain", name: "고도 상승", color: "#84cc16" },
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
  const [viewMode, setViewMode] = useState<HealthViewMode>("day");
  const initialRange = buildRangeFromMode("day");
  const [startDate, setStartDate] = useState<Date | undefined>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | undefined>(initialRange.end);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(overviewMetricOptions.map((metric) => metric.key));

  useEffect(() => {
    const nextRange = buildRangeFromMode(viewMode);
    setStartDate(nextRange.start);
    setEndDate(nextRange.end);
  }, [viewMode]);

  const { data: records = [], isLoading } = useHealthStats(viewMode, startDate, endDate);
  const fallbackRecords = useMemo(() => getMockHealthHistory(providerId), [providerId]);
  const effectiveRecords = records.length > 0 ? records : fallbackRecords;

  const chartData = useMemo(() => aggregateRunningChartData(effectiveRecords, viewMode), [effectiveRecords, viewMode]);

  const latest = chartData[chartData.length - 1];

  const toggleMetric = (key: string) => {
    setVisibleKeys((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]));
  };

  const visibleLines = overviewMetricOptions.filter((metric) => visibleKeys.includes(metric.key));

  const summaryCards = latest
    ? [
        { label: "거리", value: `${latest.distanceKm} km` },
        { label: "시간", value: `${latest.durationMinutes} 분` },
        { label: "평균 페이스", value: toPaceLabel(latest.avgPace) },
        { label: "최고 페이스", value: toPaceLabel(latest.bestPace) },
        { label: "평균 시속", value: `${latest.averageSpeed} km/h` },
        { label: "최고 시속", value: `${latest.maxSpeed} km/h` },
        { label: "평균 심박수", value: `${latest.avgHeartRate} bpm` },
        { label: "평균 케이던스", value: `${latest.cadence} spm` },
        { label: "VO2 Max", value: latest.vo2max },
        { label: "고도 상승", value: `${latest.elevationGain} m` },
      ]
    : [];

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
          <p className="text-sm text-muted-foreground">{providerMeta.label} 기준 비교 화면입니다.</p>
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

        {chartData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">표시할 비교 데이터가 없습니다.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>러닝 요약</CardTitle>
                <CardDescription>아래 색상 텍스트를 눌러 그래프 항목을 켜고 끌 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MetricLineChart data={chartData} xKey="date" lines={visibleLines} />

                <div className="flex flex-wrap gap-3 text-sm">
                  {overviewMetricOptions.map((metric) => {
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

                <MetricGrid items={summaryCards} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>러닝 분석</CardTitle>
                <CardDescription>거리, 시간, 페이스, 시속, 심박수, 케이던스, VO2 Max, 고도 데이터를 함께 봅니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MetricLineChart
                  data={chartData}
                  xKey="date"
                  lines={[
                    { key: "distanceKm", name: "거리(km)", color: "#8b5cf6" },
                    { key: "durationMinutes", name: "시간(분)", color: "#06b6d4" },
                    { key: "avgPace", name: "평균 페이스", color: "#ef4444" },
                    { key: "averageSpeed", name: "평균 시속", color: "#22c55e" },
                    { key: "avgHeartRate", name: "평균 심박수", color: "#ec4899" },
                    { key: "cadence", name: "평균 케이던스", color: "#6366f1" },
                    { key: "vo2max", name: "VO2 Max", color: "#14b8a6" },
                    { key: "elevationGain", name: "고도 상승", color: "#84cc16" },
                  ]}
                />
                <MetricGrid items={summaryCards} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Comparison;
