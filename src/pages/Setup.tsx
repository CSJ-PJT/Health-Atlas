import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle } from "lucide-react";

const Setup = () => {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = () => {
    if (!apiKey || !projectId) {
      toast({
        title: "입력 오류",
        description: "API Key와 Project ID를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage (in production, use secure storage)
    localStorage.setItem("openai_api_key", apiKey);
    localStorage.setItem("openai_project_id", projectId);
    localStorage.setItem("setup_completed", "true");

    toast({
      title: "설정 완료",
      description: "앱을 사용할 준비가 완료되었습니다.",
    });

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <img src="/app-icon.png" alt="Logo" className="h-20 w-20 mx-auto" />
          <h1 className="text-3xl font-bold">Roboheart Healthcare</h1>
          <p className="text-muted-foreground">초기 설정을 시작합니다</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI 연동</CardTitle>
            <CardDescription>
              ChatGPT와 연동하여 건강 데이터를 분석하고 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-id">OpenAI Project ID</Label>
                <Input
                  id="project-id"
                  type="text"
                  placeholder="proj_..."
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">연동 방법</h3>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className={`mt-1 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step >= 1 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">1단계: OpenAI 계정 생성</p>
                    <p className="text-sm text-muted-foreground">
                      <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        OpenAI Platform
                      </a>에서 계정을 만듭니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className={`mt-1 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step >= 2 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">2단계: API Key 생성</p>
                    <p className="text-sm text-muted-foreground">
                      API Keys 메뉴에서 "Create new secret key"를 클릭하여 API Key를 생성합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className={`mt-1 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step >= 3 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">3단계: 프로젝트 생성</p>
                    <p className="text-sm text-muted-foreground">
                      "관리" 프로젝트를 생성하고 Project ID를 복사합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className={`mt-1 ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step >= 4 ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">4단계: 정보 입력</p>
                    <p className="text-sm text-muted-foreground">
                      위 입력란에 API Key와 Project ID를 입력합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(Math.min(step + 1, 4))} variant="outline" className="flex-1">
                다음 단계
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                설정 완료
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/10">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">📱 삼성헬스 자동 연동</p>
              <p className="text-muted-foreground">
                앱 설치 시 삼성헬스와 자동으로 연동되며, 건강 데이터를 안전하게 수집합니다.
              </p>
              <p className="font-semibold mt-4">💾 데이터 보관</p>
              <p className="text-muted-foreground">
                모든 데이터는 앱 삭제 전까지 영구 보존됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
