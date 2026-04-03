import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { apiKeySchema, nicknameSchema, projectIdSchema } from "@/lib/validationSchemas";
import { startKakaoLogin } from "@/services/auth/kakaoAuth";
import { startLineLogin } from "@/services/auth/lineAuth";
import { getKakaoAuthConfig, getLineAuthConfig } from "@/services/auth/socialAuthStore";
import {
  clearPendingOpenAiCredentials,
  getPendingOpenAiCredentials,
  hasPendingOpenAiCredentials,
  savePendingOpenAiCredentials,
} from "@/services/security/openAiCredentialStore";

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

    if (hasPendingOpenAiCredentials()) {
      const pending = getPendingOpenAiCredentials();
      setApiKey(pending.apiKey);
      setProjectId(pending.projectId);
      setStep(2);
    }
  }, [navigate]);

  const handleNext = async () => {
    if (!apiKey || !projectId) {
      toast({
        title: "입력 오류",
        description: "API Key와 Project ID를 모두 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedApiKey = apiKeySchema.parse(apiKey);
      const validatedProjectId = projectIdSchema.parse(projectId);

      savePendingOpenAiCredentials(validatedApiKey, validatedProjectId);
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
    clearPendingOpenAiCredentials();
    localStorage.setItem("openai_enabled", "false");
    setStep(2);
  };

  const handleComplete = async () => {
    if (!nickname) {
      toast({
        title: "입력 오류",
        description: "닉네임을 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedNickname = nicknameSchema.parse(nickname);
      const generatedUserId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: generatedUserId,
          nickname: validatedNickname,
          user_id_changed: false,
        })
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      const openaiEnabled = localStorage.getItem("openai_enabled");
      if (openaiEnabled === "true" && profileData) {
        const pending = getPendingOpenAiCredentials();
        if (pending.apiKey && pending.projectId) {
          const { error: credError } = await supabase.from("openai_credentials").insert({
            profile_id: profileData.id,
            api_key: pending.apiKey,
            project_id: pending.projectId,
          });

          if (credError) {
            throw credError;
          }
        }
      }

      clearPendingOpenAiCredentials();
      localStorage.setItem("user_id", generatedUserId);
      localStorage.setItem("user_nickname", validatedNickname);
      localStorage.setItem("profile_id", profileData.id);
      localStorage.setItem("setup_completed", "true");

      toast({
        title: "설정 완료",
        description: "앱 사용 준비가 완료되었습니다.",
      });

      window.location.href = "/";
    } catch (error: any) {
      console.error("Setup error:", error);
      toast({
        title: "설정 실패",
        description: error?.errors?.[0]?.message || "설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleKakaoStart = () => {
    const config = getKakaoAuthConfig();
    if (!config.restApiKey || !config.redirectUri) {
      toast({
        title: "Kakao 설정이 필요합니다",
        description: "설정 > 연동에서 REST API 키와 Redirect URI를 먼저 저장해 주세요.",
        variant: "destructive",
      });
      return;
    }
    startKakaoLogin();
  };

  const handleLineStart = () => {
    const config = getLineAuthConfig();
    if (!config.channelId || !config.redirectUri) {
      toast({
        title: "LINE 설정이 필요합니다",
        description: "설정 > 연동에서 Channel ID와 Redirect URI를 먼저 저장해 주세요.",
        variant: "destructive",
      });
      return;
    }
    startLineLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <img src="/app-icon.png" alt="Logo" className="mx-auto h-20 w-20" />
          <h1 className="text-3xl font-bold">Roboheart Healthcare</h1>
          <p className="text-muted-foreground">초기 설정을 시작합니다.</p>
        </div>

        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle>소셜 로그인으로 시작</CardTitle>
            <CardDescription>Kakao와 LINE 로그인 연결을 먼저 시도할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Button onClick={handleKakaoStart} className="w-full">
              Kakao로 시작
            </Button>
            <Button onClick={handleLineStart} variant="outline" className="w-full">
              LINE으로 시작
            </Button>
          </CardContent>
        </Card>

        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>OpenAI 연동</CardTitle>
              <CardDescription>AI 코치와 예측 기능을 위해 OpenAI 키를 연결합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">OpenAI API Key</Label>
                  <Input id="api-key" type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-id">OpenAI Project ID</Label>
                  <Input id="project-id" type="text" placeholder="proj_..." value={projectId} onChange={(e) => setProjectId(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. OpenAI Platform에서 API Key를 생성합니다.</p>
                <p>2. 프로젝트를 만들고 Project ID를 확인합니다.</p>
                <p>3. 두 값을 입력하면 AI 코치와 예측 기능을 바로 사용할 수 있습니다.</p>
              </div>

              <div className="space-y-3">
                <Button onClick={handleNext} className="w-full">
                  다음
                </Button>
                <Button onClick={handleSkip} variant="outline" className="w-full">
                  나중에 설정하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>닉네임 설정</CardTitle>
              <CardDescription>사용할 닉네임을 입력해 주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nickname">닉네임</Label>
                <Input id="nickname" type="text" placeholder="사용할 닉네임을 입력하세요" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>

              <Button onClick={handleComplete} className="w-full">
                설정 완료
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-accent/10">
          <CardContent className="pt-6 text-sm">
            <p className="font-semibold">소셜 연동 안내</p>
            <p className="mt-2 text-muted-foreground">Kakao 로그인은 RH Healthcare 도메인과 Redirect URI가 정확히 맞아야 정상 동작합니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
