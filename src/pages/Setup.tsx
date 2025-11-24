import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { apiKeySchema, projectIdSchema, nicknameSchema } from "@/lib/validationSchemas";

const Setup = () => {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const existingNickname = localStorage.getItem("user_nickname");
    const setupCompleted = localStorage.getItem("setup_completed");
    
    if (setupCompleted === "true" && existingNickname) {
      navigate("/");
      return;
    }
    
    const existingApiKey = localStorage.getItem("openai_api_key");
    const existingProjectId = localStorage.getItem("openai_project_id");
    
    if (existingApiKey && existingProjectId) {
      setStep(2);
    }
  }, [navigate]);

  const handleNext = async () => {
    if (!apiKey || !projectId) {
      toast({
        title: "입력 오류",
        description: "API Key와 Project ID를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedApiKey = apiKeySchema.parse(apiKey);
      const validatedProjectId = projectIdSchema.parse(projectId);

      localStorage.setItem("openai_api_key", validatedApiKey);
      localStorage.setItem("openai_project_id", validatedProjectId);
      localStorage.setItem("openai_enabled", "true");
      setStep(2);
    } catch (error: any) {
      if (error.errors) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem("openai_enabled", "false");
    setStep(2);
  };

  const handleComplete = async () => {
    if (!nickname) {
      toast({
        title: "입력 오류",
        description: "닉네임을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedNickname = nicknameSchema.parse(nickname);

      // 자동으로 사용자 ID 생성 (uuid 기반)
      const generatedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Supabase에 프로필 저장
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: generatedUserId,
          nickname: validatedNickname,
          user_id_changed: false
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // OpenAI 설정이 있으면 저장
      const openaiEnabled = localStorage.getItem("openai_enabled");
      if (openaiEnabled === "true" && profileData) {
        const apiKey = localStorage.getItem("openai_api_key");
        const projectId = localStorage.getItem("openai_project_id");

        if (apiKey && projectId) {
          const { error: credError } = await supabase
            .from("openai_credentials")
            .insert({
              profile_id: profileData.id,
              api_key: apiKey,
              project_id: projectId
            });

          if (credError) throw credError;
        }
      }

      localStorage.setItem("user_id", generatedUserId);
      localStorage.setItem("user_nickname", validatedNickname);
      localStorage.setItem("profile_id", profileData.id);
      localStorage.setItem("setup_completed", "true");

      toast({
        title: "설정 완료",
        description: "앱을 사용할 준비가 완료되었습니다.",
      });

      window.location.href = "/";
    } catch (error: any) {
      console.error("Setup error:", error);
      if (error.errors) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "오류",
          description: "설정 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
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

              <div className="space-y-3">
                <Button onClick={handleNext} className="w-full">
                  다음
                </Button>
                <Button onClick={handleSkip} variant="outline" className="w-full">
                  나중에 설정하기 (건너뛰기)
                </Button>
              </div>
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
