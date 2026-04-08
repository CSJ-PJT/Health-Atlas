import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { exchangeKakaoCode, getKakaoUserProfile } from "@/services/auth/kakaoAuth";

const SocialAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("소셜 로그인을 처리하는 중입니다.");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const pathname = location.pathname;
      const code = params.get("code");
      const error = params.get("error");
      const state = params.get("state");

      if (error) {
        setMessage(`소셜 로그인 실패: ${error}`);
        return;
      }

      if (!code) {
        setMessage("인가 코드가 없습니다.");
        return;
      }

      try {
        if (pathname.includes("/kakao/")) {
          const savedState = localStorage.getItem("kakao_oauth_state");
          if (savedState && state && savedState !== state) {
            throw new Error("state 값이 일치하지 않습니다.");
          }

          const token = await exchangeKakaoCode(code);
          const profile = await getKakaoUserProfile(token.access_token);
          const kakaoId = String(profile.id);
          const nickname =
            profile.properties?.nickname ||
            profile.kakao_account?.profile?.nickname ||
            `kakao_${kakaoId.slice(-6)}`;

          let { data: existing } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", `kakao_${kakaoId}`)
            .maybeSingle();

          if (!existing) {
            const created = await supabase
              .from("profiles")
              .insert({
                user_id: `kakao_${kakaoId}`,
                nickname,
                user_id_changed: false,
              })
              .select()
              .single();

            if (created.error) {
              throw created.error;
            }
            existing = created.data;
          }

          localStorage.setItem("user_id", existing.user_id);
          localStorage.setItem("user_nickname", existing.nickname || nickname);
          localStorage.setItem("profile_id", existing.id);
          localStorage.setItem("setup_completed", "true");
          localStorage.setItem("kakao_connected", "true");

          setMessage("Kakao 로그인이 완료되었습니다. 홈으로 이동합니다.");
          window.setTimeout(() => navigate("/"), 1200);
          return;
        }

        setMessage("아직 구현되지 않은 소셜 로그인 콜백입니다.");
      } catch (authError) {
        console.error("Social auth callback failed:", authError);
        setMessage(authError instanceof Error ? authError.message : "소셜 로그인 처리 중 오류가 발생했습니다.");
      }
    };

    void run();
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>소셜 로그인</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialAuthCallback;
