import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useHealthHistory } from "@/hooks/useHealthData";

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

const History = () => {
  const { data: records = [], isLoading: loading } = useHealthHistory();

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
      blood_oxygen: '혈중산소',
      skin_temperature: '피부온도',
      snoring: '코골이',
      weight: '체중',
      bodyFat: '체지방률',
      body_fat: '체지방률',
      body_fat_mass: '체지방량',
      body_water: '체수분',
      bmi: 'BMI',
      basal_metabolic_rate: '기초대사량',
      muscleMass: '근육량',
      muscle_mass: '근육량',
      name: '식사',
      carbs: '탄수화물',
      protein: '단백질',
      fat: '지방',
      count: '걸음수',
      floors: '층수',
      avg_cadence: '평균케이던스',
      average_cadence: '평균케이던스',
      avg_heart_rate: '평균심박수',
      average_heart_rate: '평균심박수',
      avg_pace: '평균페이스',
      average_pace: '평균페이스',
      vo2_max: '산소섭취량'
    };

    const unitMap: Record<string, string> = {
      duration: '분',
      calories: 'kcal',
      distance: 'km',
      weight: 'kg',
      bodyFat: '%',
      body_fat: '%',
      body_fat_mass: 'kg',
      body_water: '%',
      basal_metabolic_rate: 'kcal',
      muscleMass: 'kg',
      muscle_mass: 'kg',
      carbs: 'g',
      protein: 'g',
      fat: 'g',
      count: '걸음',
      floors: '층',
      blood_oxygen: '%',
      skin_temperature: '°C',
      snoring: '분',
      avg_cadence: 'spm',
      average_cadence: 'spm',
      avg_heart_rate: 'bpm',
      average_heart_rate: 'bpm',
      avg_pace: '분/km',
      average_pace: '분/km',
      vo2_max: 'ml/kg/min'
    };

    const koreanKey = keyMap[key] || key;
    const unit = unitMap[key] || '';
    return `${koreanKey}: ${value}${unit}`;
  };

  const renderDataSection = (title: string, icon: any, data: any) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
    
    const Icon = icon;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <div className="pl-6 space-y-2">
          {Array.isArray(data) ? (
            data.map((item, index) => (
              <div key={index} className="text-sm space-y-0.5">
                {Object.entries(item).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{formatDataItem(key, value)}</span>
                  </div>
                ))}
                {index < data.length - 1 && <div className="border-b border-border/50 my-1" />}
              </div>
            ))
          ) : (
            Object.entries(data).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-medium">{formatDataItem(key, value)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">기록</h1>

        {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">아직 동기화된 데이터가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-4">
                {records.map((record) => (
                  <Card 
                    key={record.id} 
                    className="overflow-hidden"
                  >
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
                      <CardTitle className="text-lg text-primary">
                        동기화 시간: {new Date(record.synced_at).toLocaleString('ko-KR')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      {record.steps_data && (
                        <div className="p-4 rounded-lg bg-secondary/20">
                          {renderDataSection('걸음수', Activity, record.steps_data)}
                        </div>
                      )}
                      {record.exercise_data && (
                        <div className="p-4 rounded-lg bg-accent/20">
                          {renderDataSection('운동', Activity, record.exercise_data)}
                        </div>
                      )}
                      {record.running_data && (
                        <div className="p-4 rounded-lg bg-muted/40">
                          {renderDataSection('러닝', Activity, record.running_data)}
                        </div>
                      )}
                      {record.sleep_data && (
                        <div className="p-4 rounded-lg bg-secondary/30">
                          {renderDataSection('수면', Activity, record.sleep_data)}
                        </div>
                      )}
                      {record.body_composition_data && (
                        <div className="p-4 rounded-lg bg-accent/15">
                          {renderDataSection('신체 구성', Activity, record.body_composition_data)}
                        </div>
                      )}
                      {record.nutrition_data && (
                        <div className="p-4 rounded-lg bg-muted/30">
                          {renderDataSection('영양', Activity, record.nutrition_data)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
      </div>
    </div>
  );
};

export default History;
