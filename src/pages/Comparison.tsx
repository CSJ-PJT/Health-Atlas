import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, subMonths, subYears, startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ko } from "date-fns/locale";
import { Header } from "@/components/Header";
import { CalendarIcon } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

interface HealthRecord {
  synced_at: string;
  exercise_data: any;
  body_composition_data: any;
  nutrition_data: any;
  running_data: any;
  sleep_data: any;
}

const Comparison = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("day");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"general" | "running">("general");
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [period, startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("health_data")
        .select("synced_at, exercise_data, body_composition_data, nutrition_data, running_data, sleep_data")
        .order("synced_at", { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte("synced_at", startDate.toISOString())
          .lte("synced_at", endDate.toISOString());
      } else {
        let calculatedStartDate: Date;
        switch (period) {
          case "day":
            calculatedStartDate = subDays(new Date(), 30);
            break;
          case "week":
            calculatedStartDate = subDays(new Date(), 14);
            break;
          case "month":
            calculatedStartDate = subMonths(new Date(), 2);
            break;
          case "year":
            calculatedStartDate = subYears(new Date(), 2);
            break;
        }
        query = query.gte("synced_at", calculatedStartDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateData = () => {
    if (!records.length) return [];

    const groupedData: { [key: string]: any } = {};

    records.forEach((record) => {
      let key: string;
      const date = new Date(record.synced_at);

      switch (period) {
        case "day":
          key = format(startOfDay(date), "yyyy-MM-dd");
          break;
        case "week":
          key = format(startOfWeek(date, { locale: ko }), "yyyy-MM-dd");
          break;
        case "month":
          key = format(date, "yyyy-MM");
          break;
        case "year":
          key = format(date, "yyyy");
          break;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          exerciseCount: 0,
          exerciseDuration: 0,
          exerciseDistance: 0,
          weight: 0,
          weightCount: 0,
          bodyFat: 0,
          bodyFatCount: 0,
          muscleMass: 0,
          muscleMassCount: 0,
          caloriesBurned: 0,
          caloriesIntake: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          proteinCount: 0,
          carbsCount: 0,
          fatCount: 0,
          bodyFatMass: 0,
          bodyFatMassCount: 0,
          // Sleep
          totalSleep: 0,
          deepSleep: 0,
          lightSleep: 0,
          remSleep: 0,
          sleepCount: 0,
          // Running specific
          avgPace: 0,
          bestPace: 0,
          worstPace: 0,
          avgHeartRate: 0,
          maxHeartRate: 0,
          minHeartRate: 0,
          cadence: 0,
          speed: 0,
          vo2max: 0,
          elevation: 0,
          runningCount: 0,
        };
      }

      // 운동 데이터 집계
      if (record.exercise_data) {
        groupedData[key].exerciseCount += 1;
        if (record.exercise_data.duration) {
          groupedData[key].exerciseDuration += Number(record.exercise_data.duration) || 0;
        }
        if (record.exercise_data.distance) {
          groupedData[key].exerciseDistance += Number(record.exercise_data.distance) || 0;
        }
        if (record.exercise_data.calories) {
          groupedData[key].caloriesBurned += Number(record.exercise_data.calories) || 0;
        }
      }

      // 러닝 데이터 집계
      if (record.running_data) {
        groupedData[key].runningCount += 1;
        if (record.running_data.avgPace) groupedData[key].avgPace += Number(record.running_data.avgPace) || 0;
        if (record.running_data.bestPace) groupedData[key].bestPace += Number(record.running_data.bestPace) || 0;
        if (record.running_data.worstPace) groupedData[key].worstPace += Number(record.running_data.worstPace) || 0;
        if (record.running_data.avgHeartRate) groupedData[key].avgHeartRate += Number(record.running_data.avgHeartRate) || 0;
        if (record.running_data.maxHeartRate) groupedData[key].maxHeartRate += Number(record.running_data.maxHeartRate) || 0;
        if (record.running_data.minHeartRate) groupedData[key].minHeartRate += Number(record.running_data.minHeartRate) || 0;
        if (record.running_data.cadence) groupedData[key].cadence += Number(record.running_data.cadence) || 0;
        if (record.running_data.speed) groupedData[key].speed += Number(record.running_data.speed) || 0;
        if (record.running_data.vo2max) groupedData[key].vo2max += Number(record.running_data.vo2max) || 0;
        if (record.running_data.elevation) groupedData[key].elevation += Number(record.running_data.elevation) || 0;
      }

      // 체성분 데이터 집계
      if (record.body_composition_data) {
        if (record.body_composition_data.weight) {
          groupedData[key].weight += Number(record.body_composition_data.weight) || 0;
          groupedData[key].weightCount += 1;
        }
        if (record.body_composition_data.bodyFat) {
          groupedData[key].bodyFat += Number(record.body_composition_data.bodyFat) || 0;
          groupedData[key].bodyFatCount += 1;
        }
        if (record.body_composition_data.muscleMass) {
          groupedData[key].muscleMass += Number(record.body_composition_data.muscleMass) || 0;
          groupedData[key].muscleMassCount += 1;
        }
        if (record.body_composition_data.bodyFatMass) {
          groupedData[key].bodyFatMass += Number(record.body_composition_data.bodyFatMass) || 0;
          groupedData[key].bodyFatMassCount += 1;
        }
      }

      // 수면 데이터 집계
      if (record.sleep_data) {
        groupedData[key].sleepCount += 1;
        
        const parseDuration = (duration: string) => {
          const match = duration.match(/(\d+)시간\s*(\d+)분/);
          if (match) {
            return parseFloat(match[1]) + parseFloat(match[2]) / 60;
          }
          return 0;
        };
        
        if (record.sleep_data.duration) {
          groupedData[key].totalSleep += parseDuration(record.sleep_data.duration);
        }
        if (record.sleep_data.deep_sleep) {
          groupedData[key].deepSleep += parseDuration(record.sleep_data.deep_sleep);
        }
        if (record.sleep_data.light_sleep) {
          groupedData[key].lightSleep += parseDuration(record.sleep_data.light_sleep);
        }
        if (record.sleep_data.rem_sleep) {
          groupedData[key].remSleep += parseDuration(record.sleep_data.rem_sleep);
        }
      }

      // 영양 데이터 집계
      if (record.nutrition_data) {
        if (record.nutrition_data.calories) {
          groupedData[key].caloriesIntake += Number(record.nutrition_data.calories) || 0;
        }
        if (record.nutrition_data.protein) {
          const proteinValue = typeof record.nutrition_data.protein === 'string' 
            ? parseFloat(record.nutrition_data.protein.replace(/[^0-9.]/g, ''))
            : Number(record.nutrition_data.protein);
          if (!isNaN(proteinValue)) {
            groupedData[key].protein += proteinValue;
            groupedData[key].proteinCount += 1;
          }
        }
        if (record.nutrition_data.carbs) {
          const carbsValue = typeof record.nutrition_data.carbs === 'string'
            ? parseFloat(record.nutrition_data.carbs.replace(/[^0-9.]/g, ''))
            : Number(record.nutrition_data.carbs);
          if (!isNaN(carbsValue)) {
            groupedData[key].carbs += carbsValue;
            groupedData[key].carbsCount += 1;
          }
        }
        if (record.nutrition_data.fat) {
          const fatValue = typeof record.nutrition_data.fat === 'string'
            ? parseFloat(record.nutrition_data.fat.replace(/[^0-9.]/g, ''))
            : Number(record.nutrition_data.fat);
          if (!isNaN(fatValue)) {
            groupedData[key].fat += fatValue;
            groupedData[key].fatCount += 1;
          }
        }
      }
    });

    // 평균 계산
    return Object.values(groupedData).map((item) => ({
      ...item,
      weight: item.weightCount > 0 ? (item.weight / item.weightCount).toFixed(1) : 0,
      bodyFat: item.bodyFatCount > 0 ? (item.bodyFat / item.bodyFatCount).toFixed(1) : 0,
      bodyFatMass: item.bodyFatMassCount > 0 ? (item.bodyFatMass / item.bodyFatMassCount).toFixed(1) : 0,
      muscleMass: item.muscleMassCount > 0 ? (item.muscleMass / item.muscleMassCount).toFixed(1) : 0,
      exerciseDuration: item.exerciseDuration.toFixed(0),
      exerciseDistance: item.exerciseDistance.toFixed(1),
      caloriesBurned: item.caloriesBurned.toFixed(0),
      caloriesIntake: item.caloriesIntake.toFixed(0),
      protein: item.proteinCount > 0 ? (item.protein / item.proteinCount).toFixed(1) : 0,
      carbs: item.carbsCount > 0 ? (item.carbs / item.carbsCount).toFixed(1) : 0,
      fat: item.fatCount > 0 ? (item.fat / item.fatCount).toFixed(1) : 0,
      avgPace: item.runningCount > 0 ? (item.avgPace / item.runningCount).toFixed(2) : 0,
      bestPace: item.runningCount > 0 ? (item.bestPace / item.runningCount).toFixed(2) : 0,
      worstPace: item.runningCount > 0 ? (item.worstPace / item.runningCount).toFixed(2) : 0,
      avgHeartRate: item.runningCount > 0 ? (item.avgHeartRate / item.runningCount).toFixed(0) : 0,
      maxHeartRate: item.runningCount > 0 ? (item.maxHeartRate / item.runningCount).toFixed(0) : 0,
      minHeartRate: item.runningCount > 0 ? (item.minHeartRate / item.runningCount).toFixed(0) : 0,
      cadence: item.runningCount > 0 ? (item.cadence / item.runningCount).toFixed(0) : 0,
      speed: item.runningCount > 0 ? (item.speed / item.runningCount).toFixed(1) : 0,
      vo2max: item.runningCount > 0 ? (item.vo2max / item.runningCount).toFixed(1) : 0,
      elevation: item.runningCount > 0 ? (item.elevation / item.runningCount).toFixed(0) : 0,
      totalSleep: item.sleepCount > 0 ? (item.totalSleep / item.sleepCount).toFixed(1) : 0,
      deepSleep: item.sleepCount > 0 ? (item.deepSleep / item.sleepCount).toFixed(1) : 0,
      lightSleep: item.sleepCount > 0 ? (item.lightSleep / item.sleepCount).toFixed(1) : 0,
      remSleep: item.sleepCount > 0 ? (item.remSleep / item.sleepCount).toFixed(1) : 0,
    }));
  };

  const chartData = aggregateData();

  const getPeriodLabel = () => {
    switch (period) {
      case "day": return "일별";
      case "week": return "주별";
      case "month": return "월별";
      case "year": return "연도별";
    }
  };

  const getComparisonData = (dataKey: string) => {
    if (chartData.length < 2) return null;
    
    const current = Number(chartData[chartData.length - 1][dataKey]) || 0;
    const previous = Number(chartData[chartData.length - 2][dataKey]) || 0;
    const diff = current - previous;
    const diffPercent = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : "0";
    
    return { current, previous, diff, diffPercent };
  };

  const ComparisonHeader = ({ title, dataKey, unit = "" }: { title: string; dataKey: string; unit?: string }) => {
    const comparison = getComparisonData(dataKey);
    if (!comparison) return null;

    return (
      <div className="mb-4 p-4 bg-muted/30 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">{title}</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">
              {period === "day" ? "전일" : period === "week" ? "전주" : period === "month" ? "전월" : "전년"}
            </div>
            <div className="font-semibold">{comparison.previous}{unit}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {period === "day" ? "금일" : period === "week" ? "금주" : period === "month" ? "금월" : "금년"}
            </div>
            <div className="font-semibold">{comparison.current}{unit}</div>
          </div>
          <div>
            <div className="text-muted-foreground">차이</div>
            <div className={`font-semibold ${comparison.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.diff >= 0 ? '+' : ''}{comparison.diff.toFixed(1)}{unit} ({comparison.diff >= 0 ? '+' : ''}{comparison.diffPercent}%)
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">비교</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: ko }) : "시작일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (date) {
                      setEndDateOpen(true);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="justify-start text-left font-normal"
                  disabled={!startDate}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: ko }) : "종료일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setEndDateOpen(false);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => !startDate || date < startDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              날짜 초기화
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "general" | "running")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="general">일반비교</TabsTrigger>
              <TabsTrigger value="running">러닝비교</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="day">일별</TabsTrigger>
              <TabsTrigger value="week">주별</TabsTrigger>
              <TabsTrigger value="month">월별</TabsTrigger>
              <TabsTrigger value="year">연도별</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-6 mt-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            ) : chartData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    선택한 기간에 대한 데이터가 없습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-primary">일반 비교</h2>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>운동 시간 및 거리 추이 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>운동 시간 (분) 및 거리 (km)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="운동 시간" dataKey="exerciseDuration" unit="분" />
                      <ComparisonHeader title="운동 거리" dataKey="exerciseDistance" unit="km" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period" 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="exerciseDuration"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="운동 시간 (분)"
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="exerciseDistance"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name="운동 거리 (km)"
                            dot={{ fill: "hsl(var(--chart-3))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>칼로리 추이 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>소모 칼로리 vs 섭취 칼로리 (kcal)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="소모 칼로리" dataKey="caloriesBurned" unit="kcal" />
                      <ComparisonHeader title="섭취 칼로리" dataKey="caloriesIntake" unit="kcal" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="caloriesBurned"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            name="소모 칼로리 (kcal)"
                            dot={{ fill: "hsl(var(--destructive))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="caloriesIntake"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            name="섭취 칼로리 (kcal)"
                            dot={{ fill: "hsl(var(--chart-1))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>영양소 추이 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>탄수화물, 단백질, 지방 (g)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="탄수화물" dataKey="carbs" unit="g" />
                      <ComparisonHeader title="단백질" dataKey="protein" unit="g" />
                      <ComparisonHeader title="지방" dataKey="fat" unit="g" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="carbs"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="탄수화물 (g)"
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="protein"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="단백질 (g)"
                            dot={{ fill: "hsl(var(--chart-2))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="fat"
                            stroke="hsl(var(--chart-4))"
                            strokeWidth={2}
                            name="지방 (g)"
                            dot={{ fill: "hsl(var(--chart-4))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>체성분 변화 추이 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>체중 (kg), 체지방 (%), 체지방량 (kg), 근육량 (kg)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="체중" dataKey="weight" unit="kg" />
                      <ComparisonHeader title="체지방률" dataKey="bodyFat" unit="%" />
                      <ComparisonHeader title="체지방량" dataKey="bodyFatMass" unit="kg" />
                      <ComparisonHeader title="근육량" dataKey="muscleMass" unit="kg" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="체중 (kg)"
                            dot={{ fill: "hsl(var(--chart-2))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="bodyFat"
                            stroke="hsl(var(--chart-4))"
                            strokeWidth={2}
                            name="체지방 (%)"
                            dot={{ fill: "hsl(var(--chart-4))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="bodyFatMass"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name="체지방량 (kg)"
                            dot={{ fill: "hsl(var(--chart-3))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="muscleMass"
                            stroke="hsl(var(--chart-5))"
                            strokeWidth={2}
                            name="근육량 (kg)"
                            dot={{ fill: "hsl(var(--chart-5))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* 수면 비교 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>수면 추이 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>수면 시간 (시간)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="총 수면 시간" dataKey="totalSleep" unit="시간" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="deepSleep"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            name="깊은 수면 (시간)"
                            dot={{ fill: "hsl(var(--chart-1))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="lightSleep"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="얕은 수면 (시간)"
                            dot={{ fill: "hsl(var(--chart-2))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="remSleep"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name="렘 수면 (시간)"
                            dot={{ fill: "hsl(var(--chart-3))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                )}

                {activeTab === "running" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-primary">러닝 비교</h2>

                  <Card>
                    <CardHeader>
                      <CardTitle>러닝 시간 및 거리 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>러닝 시간 (분) 및 거리 (km)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="러닝 시간" dataKey="exerciseDuration" unit="분" />
                      <ComparisonHeader title="러닝 거리" dataKey="exerciseDistance" unit="km" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period" 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="exerciseDuration"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="시간 (분)"
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="exerciseDistance"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name="거리 (km)"
                            dot={{ fill: "hsl(var(--chart-3))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>페이스 분석 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>평균, 최고, 최저 페이스 (분/km)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="평균 페이스" dataKey="avgPace" unit="분/km" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="avgPace"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="평균 페이스"
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="bestPace"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="최고 페이스"
                            dot={{ fill: "hsl(var(--chart-2))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="worstPace"
                            stroke="hsl(var(--chart-4))"
                            strokeWidth={2}
                            name="최저 페이스"
                            dot={{ fill: "hsl(var(--chart-4))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>심박수 분석 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>평균, 최고, 최저 심박수 (bpm) 및 구간률</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ComparisonHeader title="평균 심박수" dataKey="avgHeartRate" unit="bpm" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="avgHeartRate"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            name="평균 심박수"
                            dot={{ fill: "hsl(var(--destructive))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="maxHeartRate"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            name="최고 심박수"
                            dot={{ fill: "hsl(var(--chart-1))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="minHeartRate"
                            stroke="hsl(var(--chart-3))"
                            strokeWidth={2}
                            name="최저 심박수"
                            dot={{ fill: "hsl(var(--chart-3))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-4 gap-2 p-4 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">휴식 구간</div>
                          <div className="text-sm font-semibold">15%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">유산소 구간</div>
                          <div className="text-sm font-semibold">45%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">무산소 구간</div>
                          <div className="text-sm font-semibold">30%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">최대 구간</div>
                          <div className="text-sm font-semibold">10%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>케이던스 및 속도 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>케이던스 (spm), 속도 (km/h)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="케이던스" dataKey="cadence" unit="spm" />
                      <ComparisonHeader title="속도" dataKey="speed" unit="km/h" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cadence"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="케이던스 (spm)"
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="speed"
                            stroke="hsl(var(--chart-5))"
                            strokeWidth={2}
                            name="속도 (km/h)"
                            dot={{ fill: "hsl(var(--chart-5))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>산소섭취량 및 고도 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>산소섭취량 (ml/kg/min), 누적 고도 (m)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="VO2 Max" dataKey="vo2max" unit="ml/kg/min" />
                      <ComparisonHeader title="누적 고도" dataKey="elevation" unit="m" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="vo2max"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="VO2 Max"
                            dot={{ fill: "hsl(var(--chart-2))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="elevation"
                            stroke="hsl(var(--chart-4))"
                            strokeWidth={2}
                            name="누적 고도 (m)"
                            dot={{ fill: "hsl(var(--chart-4))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>칼로리 소모 ({getPeriodLabel()})</CardTitle>
                      <CardDescription>러닝 칼로리 소모량 (kcal)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComparisonHeader title="칼로리 소모" dataKey="caloriesBurned" unit="kcal" />
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="caloriesBurned"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            name="칼로리 소모 (kcal)"
                            dot={{ fill: "hsl(var(--destructive))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Comparison;
