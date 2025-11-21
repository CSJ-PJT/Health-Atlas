import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Setup = () => {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const existingApiKey = localStorage.getItem("openai_api_key");
    const existingProjectId = localStorage.getItem("openai_project_id");
    
    if (existingApiKey && existingProjectId) {
      setStep(2);
    }
  }, []);

  const handleNext = () => {
    if (!apiKey || !projectId) {
      toast({
        title: "입력 오류",
        description: "API Key와 Project ID를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("openai_api_key", apiKey);
    localStorage.setItem("openai_project_id", projectId);
    setStep(2);
  };

  const handleComplete = () => {
    if (!nickname) {
      toast({
        title: "입력 오류",
        description: "닉네임을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("user_nickname", nickname);
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

{step === 1 ? (
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
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>에서 계정을 생성합니다.</p>
                  <p>2. API Keys 메뉴에서 "Create new secret key"를 클릭하여 API Key를 생성합니다.</p>
                  <p>3. "관리" 프로젝트를 생성하고 Project ID를 복사합니다.</p>
                  <p>4. 위 입력란에 API Key와 Project ID를 입력합니다.</p>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full">
                다음
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>닉네임 설정</CardTitle>
              <CardDescription>
                사용할 닉네임을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nickname">닉네임</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="사용할 닉네임을 입력하세요"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <Button onClick={handleComplete} className="w-full">
                설정 완료
              </Button>
            </CardContent>
          </Card>
        )}

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
