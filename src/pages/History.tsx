import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { MetricGrid } from "@/components/health/MetricGrid";
import { RouteMapCard } from "@/components/health/RouteMapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHealthHistory } from "@/hooks/useHealthData";
import { getStoredProviderId } from "@/providers/shared";
import { getMockHealthHistory } from "@/providers/shared/services/mockData";
import { buildAiRecommendation } from "@/services/aiCoach";
import { generateRunningForecast } from "@/services/runningForecast";

const detailLineOptions = [
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

const formatPace = (secondsPerKm?: number) => {
  if (!secondsPerKm) return "-";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
};

const formatMinutes = (seconds: number) => `${Math.round(seconds / 60)}분`;

type ActivityFilter = "all" | "running" | "walking";

const History = () => {
  const providerId = getStoredProviderId();
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("analysis");
  const [visibleKeys, setVisibleKeys] = useState<string[]>(detailLineOptions.map((item) => item.key));
  const [predictionSummary, setPredictionSummary] = useState("");
  const [predictionData, setPredictionData] = useState<any[]>([]);

  const { data: records = [], isLoading } = useHealthHistory("day");
  const fallbackRecords = useMemo(() => getMockHealthHistory(providerId), [providerId]);
  const effectiveRecords = records.length > 0 ? records : fallbackRecords;
  const latestRecord = effectiveRecords[effectiveRecords.length - 1];

  const allSessions = useMemo(() => (latestRecord?.running_data?.sessions || []).filter(Boolean), [latestRecord]);
  const filteredSessions = useMemo(() => {
    if (activityFilter === "all") return allSessions;
    return allSessions.filter((session: any) => session.activityType === activityFilter);
  }, [activityFilter, allSessions]);

  useEffect(() => {
    if (!filteredSessions.find((session: any) => session.activityId === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0]?.activityId || null);
    }
  }, [filteredSessions, selectedSessionId]);

  const selectedSession =
    filteredSessions.find((session: any) => session.activityId === selectedSessionId) || filteredSessions[0];

  useEffect(() => {
    let cancelled = false;
    const loadPrediction = async () => {
      const forecast = await generateRunningForecast(effectiveRecords as any[]);
      if (!cancelled) {
        setPredictionSummary(forecast.summary);
        setPredictionData(forecast.points);
      }
    };
    void loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [effectiveRecords]);

  const summaryCards = useMemo(() => {
    const totals = filteredSessions.reduce(
      (acc: any, session: any) => {
        acc.distanceKm += (session.distanceMeters || 0) / 1000;
        acc.calories += session.calories || 0;
        acc.elevationGain += session.elevationGainMeters || 0;
        acc.elevationLoss += session.elevationLossMeters || 0;
        return acc;
      },
      { distanceKm: 0, calories: 0, elevationGain: 0, elevationLoss: 0 },
    );

    return [
      { label: "총 운동 거리", value: `${totals.distanceKm.toFixed(2)} km` },
      { label: "총 칼로리", value: `${Math.round(totals.calories)} kcal` },
      { label: "총 상승", value: `${Math.round(totals.elevationGain)} m` },
      { label: "총 하강", value: `${Math.round(totals.elevationLoss)} m` },
    ];
  }, [filteredSessions]);

  const detailCards = selectedSession
    ? [
        { label: "운동 이름", value: selectedSession.activityName },
        { label: "운동 유형", value: selectedSession.activityType },
        { label: "운동 시간", value: formatMinutes(selectedSession.durationSeconds) },
        { label: "운동 거리", value: `${(selectedSession.distanceMeters / 1000).toFixed(2)} km` },
        { label: "평균 페이스", value: formatPace(selectedSession.averagePaceSecondsPerKilometer) },
        { label: "최고 페이스", value: formatPace(selectedSession.bestPaceSecondsPerKilometer) },
        { label: "평균 시속", value: `${(selectedSession.averageSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
        { label: "최고 시속", value: `${(selectedSession.maxSpeedMetersPerSecond * 3.6).toFixed(1)} km/h` },
        { label: "평균 심박수", value: `${selectedSession.averageHR} bpm` },
        { label: "최대 심박수", value: `${selectedSession.maxHR} bpm` },
        { label: "평균 케이던스", value: `${selectedSession.averageRunCadence} spm` },
        { label: "최대 케이던스", value: `${selectedSession.maxRunCadence} spm` },
        { label: "총 상승", value: `${selectedSession.elevationGainMeters} m` },
        { label: "총 하강", value: `${selectedSession.elevationLossMeters} m` },
        { label: "칼로리", value: `${selectedSession.calories} kcal` },
        { label: "온도", value: `${selectedSession.temperatureCelsius ?? "-"}°C` },
        { label: "VO2 Max", value: selectedSession.vo2Max },
        { label: "기본 효과", value: selectedSession.trainingEffectLabel || "-" },
        { label: "유산소 효과", value: selectedSession.trainingEffectAerobic || "-" },
        { label: "무산소 효과", value: selectedSession.trainingEffectAnaerobic || "-" },
        { label: "운동 부하", value: selectedSession.trainingLoad || "-" },
        { label: "예상 수분 손실", value: `${selectedSession.estimatedSweatLossMl || 0} ml` },
        { label: "보폭", value: `${selectedSession.averageStrideLengthMeters || 0} m` },
        { label: "걸음 수", value: `${selectedSession.steps || 0} 걸음` },
      ]
    : [];

  const aiSummary = selectedSession
    ? [
        `${selectedSession.activityName}은 ${Math.round(selectedSession.durationSeconds / 60)}분 동안 ${(selectedSession.distanceMeters / 1000).toFixed(2)}km를 수행한 ${selectedSession.activityType} 세션입니다.`,
        `평균 심박수 ${selectedSession.averageHR}bpm, 최대 심박수 ${selectedSession.maxHR}bpm, 평균 케이던스 ${selectedSession.averageRunCadence}spm입니다.`,
        `운동 부하 ${selectedSession.trainingLoad || 0}, 유산소 효과 ${selectedSession.trainingEffectAerobic || 0}, 무산소 효과 ${
          selectedSession.trainingEffectAnaerobic || 0
        } 기준으로 ${
          selectedSession.trainingEffectAerobic && selectedSession.trainingEffectAerobic > 3
            ? "강도가 충분한 편입니다."
            : "회복 중심의 중간 강도 세션에 가깝습니다."
        }`,
        buildAiRecommendation(effectiveRecords as any[], new Date()),
      ].join(" ")
    : "";

  const sessionChartData = selectedSession
    ? latestRecord?.running_data?.session_timelines?.[selectedSession.activityId] || []
    : [];
  const laps = selectedSession ? latestRecord?.running_data?.session_laps?.[selectedSession.activityId] || [] : [];

  const predictionCards = predictionData.length
    ? detailLineOptions.map((metric) => {
        const latestPoint = predictionData[predictionData.length - 1];
        return {
          label: `${metric.name} 예측`,
          value:
            metric.key === "avgPace" || metric.key === "bestPace"
              ? formatPace(Number(latestPoint?.[metric.key] || 0) * 60)
              : metric.key === "distanceKm"
                ? `${latestPoint?.[metric.key]} km`
                : metric.key === "durationMinutes"
                  ? `${latestPoint?.[metric.key]} 분`
                  : metric.key.includes("Speed")
                    ? `${latestPoint?.[metric.key]} km/h`
                    : metric.key.includes("HeartRate")
                      ? `${latestPoint?.[metric.key]} bpm`
                      : metric.key === "cadence"
                        ? `${latestPoint?.[metric.key]} spm`
                        : metric.key === "elevationGain"
                          ? `${latestPoint?.[metric.key]} m`
                          : `${latestPoint?.[metric.key]}`,
        };
      })
    : [];

  const toggleMetric = (key: string) => {
    setVisibleKeys((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <ScrollToTop />
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
      <ScrollToTop />
      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <h1 className="text-3xl font-bold">러닝 기록</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>오늘 기록</CardTitle>
            <div className="w-48">
              <Select value={activityFilter} onValueChange={(value: ActivityFilter) => setActivityFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="운동 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 운동</SelectItem>
                  <SelectItem value="running">러닝</SelectItem>
                  <SelectItem value="walking">워킹</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <MetricGrid items={summaryCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle>러닝 분석</CardTitle>
            <div className="flex flex-wrap gap-2">
              {filteredSessions.map((session: any) => (
                <button
                  key={session.activityId}
                  type="button"
                  onClick={() => setSelectedSessionId(session.activityId)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    selectedSession?.activityId === session.activityId ? "border-primary bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  {session.activityName}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedSession ? (
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="analysis">AI 종합 분석</TabsTrigger>
                  <TabsTrigger value="laps">랩 기록</TabsTrigger>
                  <TabsTrigger value="prediction">AI 가능성 예측</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-6">
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">{aiSummary}</div>
                  <MetricLineChart data={sessionChartData} xKey="time" lines={detailLineOptions.filter((line) => visibleKeys.includes(line.key))} />
                  <div className="flex flex-wrap gap-3 text-sm">
                    {detailLineOptions.map((line) => {
                      const active = visibleKeys.includes(line.key);
                      return (
                        <button
                          key={line.key}
                          type="button"
                          onClick={() => toggleMetric(line.key)}
                          className="font-medium transition-opacity"
                          style={{ color: active ? line.color : "#9ca3af", opacity: active ? 1 : 0.8 }}
                        >
                          {line.name}
                        </button>
                      );
                    })}
                  </div>
                  <MetricGrid items={detailCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
                  <RouteMapCard points={selectedSession.routePoints} title="운동 경로" />
                </TabsContent>

                <TabsContent value="laps">
                  <div className="overflow-x-auto rounded-xl border">
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
                </TabsContent>

                <TabsContent value="prediction" className="space-y-6">
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">{predictionSummary}</div>
                  <MetricGrid items={predictionCards} columnsClassName="grid-cols-2 md:grid-cols-4" />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-sm text-muted-foreground">표시할 운동 데이터가 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
