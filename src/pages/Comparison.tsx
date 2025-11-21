import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ko } from "date-fns/locale";
import { NavLink } from "@/components/NavLink";
import { CalendarIcon } from "lucide-react";

type Period = "week" | "month" | "year";

interface HealthRecord {
  synced_at: string;
  exercise_data: any;
  body_composition_data: any;
  nutrition_data: any;
}

const Comparison = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchRecords();
  }, [period, startDate, endDate]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("health_data")
        .select("synced_at, exercise_data, body_composition_data, nutrition_data")
        .order("synced_at", { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte("synced_at", startDate.toISOString())
          .lte("synced_at", endDate.toISOString());
      } else {
        let calculatedStartDate: Date;
        switch (period) {
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
        case "week":
          key = format(startOfWeek(date), "yyyy-MM-dd");
          break;
        case "month":
          key = format(startOfMonth(date), "yyyy-MM");
          break;
        case "year":
          key = format(startOfYear(date), "yyyy");
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
      }

      // 영양 데이터 집계
      if (record.nutrition_data) {
        if (record.nutrition_data.calories) {
          groupedData[key].caloriesIntake += Number(record.nutrition_data.calories) || 0;
        }
      }
    });

    // 평균 계산
    return Object.values(groupedData).map((item) => ({
      ...item,
      weight: item.weightCount > 0 ? (item.weight / item.weightCount).toFixed(1) : 0,
      bodyFat: item.bodyFatCount > 0 ? (item.bodyFat / item.bodyFatCount).toFixed(1) : 0,
      muscleMass: item.muscleMassCount > 0 ? (item.muscleMass / item.muscleMassCount).toFixed(1) : 0,
      exerciseDuration: item.exerciseDuration.toFixed(0),
      exerciseDistance: item.exerciseDistance.toFixed(1),
      caloriesBurned: item.caloriesBurned.toFixed(0),
      caloriesIntake: item.caloriesIntake.toFixed(0),
    }));
  };

  const chartData = aggregateData();

  const getPeriodLabel = () => {
    switch (period) {
      case "week":
        return "주별";
      case "month":
        return "월별";
      case "year":
        return "연도별";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">데이터 비교</h1>
          <div className="flex gap-2">
            <NavLink to="/">홈</NavLink>
            <NavLink to="/history">기록</NavLink>
            <NavLink to="/monitor">모니터링</NavLink>
          </div>
        </div>

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
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: ko }) : "종료일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
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

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="week">주별</TabsTrigger>
            <TabsTrigger value="month">월별</TabsTrigger>
            <TabsTrigger value="year">연도별</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="space-y-6">
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
                <Card>
                  <CardHeader>
                    <CardTitle>운동 시간 및 거리 추이 ({getPeriodLabel()})</CardTitle>
                    <CardDescription>운동 시간 (분) 및 거리 (km)</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                    <CardTitle>체성분 변화 추이 ({getPeriodLabel()})</CardTitle>
                    <CardDescription>체중 (kg), 체지방 (%), 근육량 (kg)</CardDescription>
                  </CardHeader>
                  <CardContent>
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

                <Card>
                  <CardHeader>
                    <CardTitle>칼로리 추이 ({getPeriodLabel()})</CardTitle>
                    <CardDescription>소모 칼로리 vs 섭취 칼로리 (kcal)</CardDescription>
                  </CardHeader>
                  <CardContent>
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Comparison;
