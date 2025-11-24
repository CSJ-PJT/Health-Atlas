import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollToTop } from "@/components/ScrollToTop";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nickname, setNickname] = useState("");
  
  const [homeMetrics, setHomeMetrics] = useState({
    steps: true,
    exercise: true,
    bodyComposition: true,
    sleep: true,
    nutrition: true,
  });

  const [historyMetrics, setHistoryMetrics] = useState({
    steps: true,
    exercise: true,
    running: true,
    bodyComposition: true,
    sleep: true,
    nutrition: true,
  });

  const [generalComparisonMetrics, setGeneralComparisonMetrics] = useState({
    exercise: true,
    calories: true,
    nutrition: true,
    bodyComposition: true,
    sleep: true,
  });

  const [runningComparisonMetrics, setRunningComparisonMetrics] = useState({
    distance: true,
    pace: true,
    heartRate: true,
    cadence: true,
    vo2Max: true,
    elevation: true,
    caloriesBurned: true,
  });

  useEffect(() => {
    const storedNickname = localStorage.getItem("user_nickname") || "";
    setNickname(storedNickname);
  }, []);

  const handleSave = () => {
    localStorage.setItem('homeMetrics', JSON.stringify(homeMetrics));
    localStorage.setItem('historyMetrics', JSON.stringify(historyMetrics));
    localStorage.setItem('generalComparisonMetrics', JSON.stringify(generalComparisonMetrics));
    localStorage.setItem('runningComparisonMetrics', JSON.stringify(runningComparisonMetrics));
    
    toast({
      title: "설정 저장 완료",
      description: "메뉴별 표출 항목이 저장되었습니다.",
    });
  };

  const handleNicknameChange = () => {
    if (!nickname.trim()) {
      toast({
        title: "입력 오류",
        description: "닉네임을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem("user_nickname", nickname);
    
    toast({
      title: "닉네임 변경 완료",
      description: "닉네임이 성공적으로 변경되었습니다.",
    });

    // Navigate to home to update the header
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header showNav={true} />
      <ScrollToTop />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">설정</h1>

        <Card>
          <CardHeader>
            <CardTitle>메뉴 항목 관리</CardTitle>
            <CardDescription>메뉴별 표출 항목 설정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 홈 화면 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">홈 화면</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="home-steps" 
                    checked={homeMetrics.steps}
                    onCheckedChange={(checked) => setHomeMetrics({...homeMetrics, steps: !!checked})}
                  />
                  <Label htmlFor="home-steps">걸음수</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="home-exercise" 
                    checked={homeMetrics.exercise}
                    onCheckedChange={(checked) => setHomeMetrics({...homeMetrics, exercise: !!checked})}
                  />
                  <Label htmlFor="home-exercise">운동</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="home-body" 
                    checked={homeMetrics.bodyComposition}
                    onCheckedChange={(checked) => setHomeMetrics({...homeMetrics, bodyComposition: !!checked})}
                  />
                  <Label htmlFor="home-body">신체 구성</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="home-sleep" 
                    checked={homeMetrics.sleep}
                    onCheckedChange={(checked) => setHomeMetrics({...homeMetrics, sleep: !!checked})}
                  />
                  <Label htmlFor="home-sleep">수면</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="home-nutrition" 
                    checked={homeMetrics.nutrition}
                    onCheckedChange={(checked) => setHomeMetrics({...homeMetrics, nutrition: !!checked})}
                  />
                  <Label htmlFor="home-nutrition">영양 섭취</Label>
                </div>
              </div>
            </div>

            {/* 기록 화면 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">기록 화면</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-steps" 
                    checked={historyMetrics.steps}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, steps: !!checked})}
                  />
                  <Label htmlFor="history-steps">걸음수</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-exercise" 
                    checked={historyMetrics.exercise}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, exercise: !!checked})}
                  />
                  <Label htmlFor="history-exercise">운동</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-running" 
                    checked={historyMetrics.running}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, running: !!checked})}
                  />
                  <Label htmlFor="history-running">러닝</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-body" 
                    checked={historyMetrics.bodyComposition}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, bodyComposition: !!checked})}
                  />
                  <Label htmlFor="history-body">신체 구성</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-sleep" 
                    checked={historyMetrics.sleep}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, sleep: !!checked})}
                  />
                  <Label htmlFor="history-sleep">수면</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="history-nutrition" 
                    checked={historyMetrics.nutrition}
                    onCheckedChange={(checked) => setHistoryMetrics({...historyMetrics, nutrition: !!checked})}
                  />
                  <Label htmlFor="history-nutrition">영양</Label>
                </div>
              </div>
            </div>

            {/* 일반비교 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">일반비교</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general-exercise" 
                    checked={generalComparisonMetrics.exercise}
                    onCheckedChange={(checked) => setGeneralComparisonMetrics({...generalComparisonMetrics, exercise: !!checked})}
                  />
                  <Label htmlFor="general-exercise">운동</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general-calories" 
                    checked={generalComparisonMetrics.calories}
                    onCheckedChange={(checked) => setGeneralComparisonMetrics({...generalComparisonMetrics, calories: !!checked})}
                  />
                  <Label htmlFor="general-calories">칼로리</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general-nutrition" 
                    checked={generalComparisonMetrics.nutrition}
                    onCheckedChange={(checked) => setGeneralComparisonMetrics({...generalComparisonMetrics, nutrition: !!checked})}
                  />
                  <Label htmlFor="general-nutrition">영양성분</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general-body" 
                    checked={generalComparisonMetrics.bodyComposition}
                    onCheckedChange={(checked) => setGeneralComparisonMetrics({...generalComparisonMetrics, bodyComposition: !!checked})}
                  />
                  <Label htmlFor="general-body">체성분</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general-sleep" 
                    checked={generalComparisonMetrics.sleep}
                    onCheckedChange={(checked) => setGeneralComparisonMetrics({...generalComparisonMetrics, sleep: !!checked})}
                  />
                  <Label htmlFor="general-sleep">수면</Label>
                </div>
              </div>
            </div>

            {/* 러닝비교 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">러닝비교</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-distance" 
                    checked={runningComparisonMetrics.distance}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, distance: !!checked})}
                  />
                  <Label htmlFor="running-distance">거리 & 시간</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-pace" 
                    checked={runningComparisonMetrics.pace}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, pace: !!checked})}
                  />
                  <Label htmlFor="running-pace">페이스</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-heart" 
                    checked={runningComparisonMetrics.heartRate}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, heartRate: !!checked})}
                  />
                  <Label htmlFor="running-heart">심박수</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-cadence" 
                    checked={runningComparisonMetrics.cadence}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, cadence: !!checked})}
                  />
                  <Label htmlFor="running-cadence">케이던스 & 속도</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-vo2" 
                    checked={runningComparisonMetrics.vo2Max}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, vo2Max: !!checked})}
                  />
                  <Label htmlFor="running-vo2">VO2 Max & 고도</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="running-calories" 
                    checked={runningComparisonMetrics.caloriesBurned}
                    onCheckedChange={(checked) => setRunningComparisonMetrics({...runningComparisonMetrics, caloriesBurned: !!checked})}
                  />
                  <Label htmlFor="running-calories">소모 칼로리</Label>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              설정 저장
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 items-center">
          <Button onClick={() => navigate("/account-settings")} className="w-full max-w-md">
            사용자 계정 설정
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full max-w-md">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
