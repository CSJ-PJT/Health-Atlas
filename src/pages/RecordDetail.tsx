import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";

interface HealthRecord {
  id: string;
  synced_at: string;
  steps_data?: any;
  exercise_data?: any;
  running_data?: any;
  sleep_data?: any;
  body_composition_data?: any;
  nutrition_data?: any;
}

const RecordDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const { data, error } = await supabase
        .from("health_data")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setRecord(data);
    } catch (error) {
      console.error("Error fetching record:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDataItem = (key: string, value: any): string => {
    const keyMap: Record<string, string> = {
      type: '종류',
      duration: '시간',
      calories: '칼로리',
      distance: '거리',
      deepSleep: '깊은 수면',
      deep_sleep: '깊은 수면',
      light_sleep: '얕은 수면',
      rem_sleep: 'REM 수면',
      weight: '체중',
      bodyFat: '체지방률',
      body_fat: '체지방률',
      body_fat_mass: '체지방량',
      muscleMass: '근육량',
      muscle_mass: '근육량',
      name: '식사',
      carbs: '탄수화물',
      protein: '단백질',
      fat: '지방',
      count: '걸음수'
    };

    const unitMap: Record<string, string> = {
      duration: '분',
      calories: 'kcal',
      distance: 'km',
      weight: 'kg',
      bodyFat: '%',
      body_fat: '%',
      body_fat_mass: 'kg',
      muscleMass: 'kg',
      muscle_mass: 'kg',
      carbs: 'g',
      protein: 'g',
      fat: 'g',
      count: '걸음'
    };

    const koreanKey = keyMap[key] || key;
    const unit = unitMap[key] || '';
    return `${koreanKey}: ${value}${unit}`;
  };

  const renderDataSection = (title: string, data: any, color: string) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
    
    return (
      <Card className={color}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.isArray(data) ? (
            data.map((item, index) => (
              <div key={index} className="space-y-2 p-3 rounded-lg bg-background/50">
                {Object.entries(item).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{formatDataItem(key, value)}</span>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="text-sm p-2 rounded bg-background/30">
                  <span className="font-medium">{formatDataItem(key, value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={true} />
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Button onClick={() => navigate("/history")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">기록을 찾을 수 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate("/history")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <p className="text-sm text-muted-foreground">
            {new Date(record.synced_at).toLocaleString('ko-KR')}
          </p>
        </div>

        <div className="space-y-4">
          {renderDataSection('걸음수', record.steps_data, 'bg-secondary/20')}
          {renderDataSection('운동', record.exercise_data, 'bg-accent/20')}
          {renderDataSection('러닝', record.running_data, 'bg-muted/40')}
          {renderDataSection('수면', record.sleep_data, 'bg-secondary/30')}
          {renderDataSection('신체 구성', record.body_composition_data, 'bg-accent/15')}
          {renderDataSection('영양', record.nutrition_data, 'bg-muted/30')}
        </div>
      </div>
    </div>
  );
};

export default RecordDetail;
