import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealthStats } from "@/hooks/useHealthData";
import { getStoredProviderId } from "@/providers/shared";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import type { HealthViewMode } from "@/providers/shared/types/provider";
import { isDisplayMetricEnabled } from "@/services/displaySettings";
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
  const initialRange = buildRangeFromMode("day");
  const [viewMode, setViewMode] = useState<HealthViewMode>("day");
  const [startDate, setStartDate] = useState<Date | undefined>(initialRange.start);
  const [endDate, setEndDate] = useState<Date | undefined>(initialRange.end);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(metricOptions.map((metric) => metric.key));

  const { data: records = [], isLoading } = useHealthStats(viewMode, startDate, endDate);
  const fallbackRecords = useMemo(() => getMockHealthHistory(providerId), [providerId]);
  const effectiveRecords = records.length > 0 ? records : fallbackRecords;
  const latestRecord = effectiveRecords[effectiveRecords.length - 1];
  const sessions = latestRecord?.running_data?.sessions || [];
  const selectedSession = sessions[0];
  const isSingleDayRange = !!startDate && !!endDate && differenceInCalendarDays(endDate, startDate) === 0;
  const dayTimeline = selectedSession ? latestRecord?.running_data?.session_timelines?.[selectedSession.activityId] || [] : [];
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <div className="mx-auto max-w-6xl space-y-4 p-3">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <h1 className="text-3xl font-bold">러닝 비교</h1>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
            <CardTitle>러닝 비교</CardTitle>
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
      </div>
    </div>
  );
};

export default Comparison;
